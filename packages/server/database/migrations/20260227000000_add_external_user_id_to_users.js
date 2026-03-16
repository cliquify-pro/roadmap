exports.up = function (knex) {
  return knex.schema.table("users", function (table) {
    table.integer("external_user_id").notNullable().index().after("userId");
  });
};

exports.down = function (knex) {
  return knex.schema.table("users", function (table) {
    table.dropColumn("external_user_id");
  });
};
