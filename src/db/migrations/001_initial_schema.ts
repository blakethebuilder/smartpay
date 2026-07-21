import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Tenants table
  await knex.schema.createTable('tenants', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('name', 100).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('phone', 20);
    table.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    
    table.index(['email']);
    table.index(['status']);
  });

  // Merchants table (payment gateway credentials)
  await knex.schema.createTable('merchants', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.enum('gateway', ['paystack', 'ozow']).notNullable();
    table.text('public_key_encrypted').notNullable();
    table.text('secret_key_encrypted').notNullable();
    table.text('webhook_secret_encrypted');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['tenant_id', 'gateway']);
    table.index(['is_active']);
  });

  // WhatsApp instances table
  await knex.schema.createTable('whatsapp_instances', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('instance_name', 100).notNullable();
    table.string('instance_id', 100).notNullable();
    table.enum('status', ['connected', 'disconnected', 'connecting']).defaultTo('connecting');
    table.string('phone_number', 20);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['tenant_id']);
    table.index(['status']);
    table.unique(['tenant_id', 'instance_name']);
  });

  // Customers table
  await knex.schema.createTable('customers', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('email', 255);
    table.string('phone', 20).notNullable();
    table.jsonb('metadata');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    
    table.index(['tenant_id']);
    table.index(['phone']);
    table.index(['email']);
  });

  // Invoices table
  await knex.schema.createTable('invoices', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('customer_id').references('id').inTable('customers').onDelete('CASCADE');
    table.decimal('amount', 12, 2).notNullable();
    table.string('currency', 3).defaultTo('NGN');
    table.enum('status', ['draft', 'pending', 'paid', 'failed', 'cancelled']).defaultTo('draft');
    table.text('description');
    table.jsonb('metadata');
    table.timestamp('due_date');
    table.timestamp('paid_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['tenant_id', 'status']);
    table.index(['customer_id']);
    table.index(['status']);
  });

  // Payments table
  await knex.schema.createTable('payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('invoice_id').references('id').inTable('invoices').onDelete('CASCADE');
    table.enum('gateway', ['paystack', 'ozow']).notNullable();
    table.string('gateway_reference', 255).notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.string('currency', 3).defaultTo('NGN');
    table.enum('status', ['pending', 'success', 'failed', 'refunded']).defaultTo('pending');
    table.jsonb('metadata');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['tenant_id', 'status']);
    table.index(['invoice_id']);
    table.index(['gateway_reference']);
    table.index(['gateway', 'gateway_reference']);
  });

  // Messages table
  await knex.schema.createTable('messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('instance_id').references('id').inTable('whatsapp_instances').onDelete('CASCADE');
    table.uuid('customer_id').references('id').inTable('customers').onDelete('CASCADE');
    table.enum('type', ['text', 'media', 'template']).notNullable();
    table.text('content').notNullable();
    table.enum('status', ['pending', 'sent', 'delivered', 'read', 'failed']).defaultTo('pending');
    table.text('error_message');
    table.timestamp('sent_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['tenant_id', 'status']);
    table.index(['instance_id']);
    table.index(['customer_id']);
    table.index(['status']);
  });

  // Webhook events table (for idempotency)
  await knex.schema.createTable('webhook_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('tenant_id', 100);
    table.string('gateway', 50).notNullable();
    table.string('event_type', 100).notNullable();
    table.jsonb('payload');
    table.enum('status', ['pending', 'processed', 'failed']).defaultTo('pending');
    table.text('error_message');
    table.timestamp('processed_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['gateway', 'event_type', 'status']);
    table.index(['tenant_id']);
    table.index(['status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('webhook_events');
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('invoices');
  await knex.schema.dropTableIfExists('customers');
  await knex.schema.dropTableIfExists('whatsapp_instances');
  await knex.schema.dropTableIfExists('merchants');
  await knex.schema.dropTableIfExists('tenants');
}
