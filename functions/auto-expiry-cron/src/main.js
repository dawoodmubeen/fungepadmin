import { Client, Databases, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
    // Initialize Appwrite Client
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const dbId = process.env.DATABASE_ID;
    const subsCol = process.env.SUBSCRIPTIONS_COLLECTION_ID;
    const usersCol = process.env.USERS_COLLECTION_ID;

    try {
        const now = new Date().toISOString();
        
        // 1. Query subscriptions where status='active' AND expires_at <= now
        const subsRes = await databases.listDocuments(dbId, subsCol, [
            Query.equal('status', 'active'),
            Query.lessThanEqual('expires_at', now)
        ]);

        const expiredSubs = subsRes.documents;
        let processedCount = 0;

        for (const sub of expiredSubs) {
            // 2. Set status='expired'
            await databases.updateDocument(dbId, subsCol, sub.$id, {
                status: 'expired'
            });

            // 3. Update corresponding user
            const usersRes = await databases.listDocuments(dbId, usersCol, [
                Query.equal('auth_id', sub.user_id)
            ]);
            
            if (usersRes.documents.length > 0) {
                const userDocId = usersRes.documents[0].$id;
                await databases.updateDocument(dbId, usersCol, userDocId, {
                    is_premium: false,
                    current_plan: null,
                    premium_expires_at: null,
                    active_subscription_id: null,
                    updated_at: now
                });
            }
            
            processedCount++;
        }

        log(`Successfully processed ${processedCount} expired subscriptions.`);
        return res.json({ success: true, processed: processedCount });

    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
