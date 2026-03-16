exports.up = function (knex) {
  return knex.schema.table("users", function (table) {
    table
      .integer("external_user_id")
      .notNullable()
      .unique() // ← adds UNIQUE constraint (fixes ON CONFLICT in migration script)
      .index()
      .after("userId");
  });
};

exports.down = function (knex) {
  return knex.schema.table("users", function (table) {
    table.dropColumn("external_user_id");
  });
};
