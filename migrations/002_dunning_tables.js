import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Dunning rules table
  await knex.schema.createTable('dunning_rules', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.boolean('enabled').defaultTo(true);
    table.integer('reminder1_delay_hours').defaultTo(24);
    table.integer('reminder2_delay_hours').defaultTo(48);
    table.integer('reminder3_delay_hours').defaultTo(72);
    table.text('reminder1_message');
    table.text('reminder2_message');
    table.text('reminder3_message');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['tenant_id']);
    table.index(['enabled']);
  });

  // Dunning logs table
  await knex.schema.createTable('dunning_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('invoice_id').references('id').inTable('invoices').onDelete('CASCADE');
    table.uuid('customer_id').references('id').inTable('customers').onDelete('CASCADE');
    table.integer('reminder_number').notNullable();
    table.timestamp('sent_at').defaultTo(knex.fn.now());
    table.enum('status', ['sent', 'failed', 'cancelled']).defaultTo('sent');
    table.text('error_message');

    table.index(['tenant_id', 'invoice_id']);
    table.index(['invoice_id', 'reminder_number']);
    table.index(['status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dunning_logs');
  await knex.schema.dropTableIfExists('dunning_rules');
}
