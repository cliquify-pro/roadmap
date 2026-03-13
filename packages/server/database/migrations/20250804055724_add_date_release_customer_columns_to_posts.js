/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table("posts", function (table) {
    table.date("date"); // for quarter filtering
    table.date("release_date").nullable(); // optional
    table
      .enum("public", ["Yes", "No"], {
        useNative: true,
        enumName: "post_visibility_enum",
      })
      .defaultTo("Yes"); // post visibility
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw(`ALTER TABLE posts DROP COLUMN IF EXISTS date`);
  await knex.raw(`ALTER TABLE posts DROP COLUMN IF EXISTS release_date`);
  await knex.raw(`ALTER TABLE posts DROP COLUMN IF EXISTS public`);
  await knex.raw(`DROP TYPE IF EXISTS post_visibility_enum`);
};
