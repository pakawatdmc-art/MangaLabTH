const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_k8bJY1LAUtmj@ep-rapid-paper-a158ae3p-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
});

async function main() {
    await client.connect();
    const res = await client.query('SELECT id, email, role, clerk_id FROM users');
    console.log('Users found:', res.rows.length);
    res.rows.forEach(user => {
        console.log(`- ${user.email} (${user.role}) [ID: ${user.id}]`);
    });
    await client.end();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
