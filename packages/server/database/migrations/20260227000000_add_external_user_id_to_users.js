exports.up = function (knex) {
  return knex.schema
    .table("users", function (table) {
      table
        .integer("external_user_id")
        .notNullable()
        .unique() // ← adds UNIQUE constraint (fixes ON CONFLICT in migration script)
        .index()
        .after("userId");
    })
    .alterTable("users", function (table) {
      table.string("name", 100).alter(); // increase name to VARCHAR(100)
      table.string("username", 100).alter(); // increase username to VARCHAR(100)
    });
};

exports.down = function (knex) {
  return knex.schema
    .alterTable("users", function (table) {
      table.string("name", 100).alter(); // revert name back to original size
      table.string("username", 100).alter(); // revert username back to original size
    })
    .table("users", function (table) {
      table.dropColumn("external_user_id");
    });
};
