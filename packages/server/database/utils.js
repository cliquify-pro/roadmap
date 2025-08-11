exports.up = async function (knex) {
  return knex.schema
    .table("posts", (table) => {
      table.integer("index").defaultTo(0).notNullable();
    })
    .then(async () => {
      await knex.raw(`
        WITH ranked AS (
          SELECT postId, roadmap_id, ROW_NUMBER() OVER (PARTITION BY roadmap_id ORDER BY createdAt) - 1 AS new_index
          FROM posts
          WHERE roadmap_id IS NOT NULL
        )
        UPDATE posts
        SET index = ranked.new_index
        FROM ranked
        WHERE posts.postId = ranked.postId;
      `);
      console.log("Added and initialized index column in posts table");
    })
    .catch((err) => {
      console.error("Error adding index column:", err.message);
      throw err;
    });
};

exports.down = async function (knex) {
  return knex.schema
    .table("posts", (table) => {
      table.dropColumn("index");
    })
    .then(() => {
      console.log("Dropped index column from posts table");
    })
    .catch((err) => {
      console.error("Error dropping index column:", err.message);
      throw err;
    });
};
