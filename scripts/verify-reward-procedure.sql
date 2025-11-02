-- Stored procedure to handle feedback submission and reward atomically
create or replace function verify_and_reward_feedback(
  p_campaign_id uuid,
  p_sku_id uuid,
  p_customer_phone text,
  p_qr_token text,
  p_location jsonb,
  p_rating integer,
  p_customer_name text default null,
  p_comment text default null,
  p_custom_answers jsonb default '{}'::jsonb
) returns json language plpgsql security definer as $$
declare
  v_qr_code record;
  v_reward_amount integer;
  v_reward_description text;
  v_feedback_id uuid;
  v_token_hash text;
  v_sentiment text;
begin
  -- Start transaction
  begin
    -- Calculate token hash if provided
    if p_qr_token ~ '^[0-9a-fA-F-]{36,}$' then
      -- It's a UUID, use as is
      select * into v_qr_code
      from qr_codes
      where id = p_qr_token::uuid
      and is_used = false
      for update;
    else
      -- It's a token, use hash
      v_token_hash := encode(digest(p_qr_token, 'sha256'), 'hex');
      select * into v_qr_code
      from qr_codes
      where token_hash = v_token_hash
      and is_used = false
      for update;
    end if;

    -- Check if QR code exists and is unused
    if v_qr_code is null then
      return json_build_object('error', 'QR code not found or already used');
    end if;

    -- Check for duplicate customer submission in this campaign
    if exists (
      select 1
      from feedback
      where campaign_id = p_campaign_id
      and customer_phone = p_customer_phone
    ) then
      return json_build_object('error', 'Customer has already submitted feedback for this campaign');
    end if;

    -- Determine sentiment
    v_sentiment := case
      when p_rating >= 4 then 'positive'
      when p_rating = 3 then 'neutral'
      else 'negative'
    end;

    -- Insert feedback
    insert into feedback (
      campaign_id,
      sku_id,
      customer_phone,
      customer_name,
      rating,
      comment,
      sentiment,
      custom_answers,
      verified,
      location
    )
    values (
      p_campaign_id,
      p_sku_id,
      p_customer_phone,
      p_customer_name,
      p_rating,
      p_comment,
      v_sentiment,
      p_custom_answers,
      true,
      p_location
    )
    returning id into v_feedback_id;

    -- Mark QR code as used
    update qr_codes
    set
      is_used = true,
      used_at = now(),
      used_by = p_customer_phone,
      location = p_location
    where id = v_qr_code.id;

    -- Process reward for positive ratings
    if p_rating >= 4 then
      -- Get reward amount based on SKU
      select
        case weight
          when '500g' then 30
          else 20
        end as amount,
        case weight
          when '500g' then '30 KES Data Bundle (150MB)'
          else '20 KES Data Bundle (100MB)'
        end as description
      into v_reward_amount, v_reward_description
      from product_skus
      where id = p_sku_id;

      -- Create reward record
      insert into rewards (
        feedback_id,
        customer_phone,
        amount,
        reward_name,
        status
      )
      values (
        v_feedback_id,
        p_customer_phone,
        v_reward_amount,
        v_reward_description,
        'pending'
      );
    end if;

    return json_build_object(
      'success', true,
      'feedback_id', v_feedback_id,
      'reward_amount', v_reward_amount,
      'reward_description', v_reward_description
    );
  exception
    when others then
      -- Rollback is automatic
      return json_build_object('error', SQLERRM);
  end;
end;
$$;