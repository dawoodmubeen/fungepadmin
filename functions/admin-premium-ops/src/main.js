import { Client, Databases, ID } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
    let payload;
    try {
        if (typeof req.body === 'string' && req.body.length > 0) {
            payload = JSON.parse(req.body);
        } else if (typeof req.bodyString === 'string' && req.bodyString.length > 0) {
            payload = JSON.parse(req.bodyString);
        } else if (typeof req.body === 'object' && req.body !== null && Object.keys(req.body).length > 0) {
            payload = req.body;
        } else {
            return res.json({ success: false, error: 'Missing request body' }, 400);
        }
    } catch (err) {
        return res.json({ success: false, error: 'Invalid JSON payload' }, 400);
    }

    const { action, requestId, subscriptionId, adminNote, cancellationReason } = payload;
    const adminUserId = req.headers['x-appwrite-user-id'] || 'unknown_admin';

    // Initialize Appwrite Client
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const dbId = process.env.DATABASE_ID;
    const premiumReqCol = process.env.PREMIUM_REQUESTS_COLLECTION_ID;
    const subsCol = process.env.SUBSCRIPTIONS_COLLECTION_ID;
    const usersCol = process.env.USERS_COLLECTION_ID;
    const couponUsagesCol = process.env.COUPON_USAGES_COLLECTION_ID;
    const couponsCol = process.env.COUPONS_COLLECTION_ID;

    try {
        if (action === 'approve') {
            // 1. Fetch request
            const request = await databases.getDocument(dbId, premiumReqCol, requestId);
            if (request.status !== 'pending') {
                return res.json({ success: false, error: 'Request is not pending.' }, 400);
            }

            const now = new Date();
            // Assuming 1 year duration
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);

            const sub = await databases.createDocument(dbId, subsCol, ID.unique(), {
                user_id: request.user_id,
                user_name: request.user_name,
                user_email: request.email,
                plan: request.plan || 'Premium',
                status: 'active',
                start_date: now.toISOString(),
                expiry_date: expiryDate.toISOString(),
                amount_paid: request.final_amount || request.amount,
                original_amount: request.amount,
                discount_amount: request.discount_amount || 0,
                coupon_code: request.coupon_code || '',
                payment_request_id: request.$id
            });

            // 3. Update user
            const usersRes = await databases.listDocuments(dbId, usersCol, [
                `equal("auth_id", "${request.user_id}")`
            ]);
            
            if (usersRes.documents.length > 0) {
                const userDocId = usersRes.documents[0].$id;
                await databases.updateDocument(dbId, usersCol, userDocId, {
                    is_premium: true,
                    current_plan: request.plan || 'Premium',
                    premium_expires_at: expiryDate.toISOString(),
                    active_subscription_id: sub.$id,
                    updated_at: now.toISOString()
                });
            }

            // 4. Update request
            await databases.updateDocument(dbId, premiumReqCol, request.$id, {
                status: 'approved',
                reviewed_by: adminUserId,
                reviewed_at: now.toISOString(),
                admin_note: adminNote || ''
            });

            // 5. Coupon logic (if applicable)
            if (request.coupon_code) {
                try {
                    const couponRes = await databases.listDocuments(dbId, couponsCol, [
                        `equal("code", "${request.coupon_code}")`
                    ]);
                    if (couponRes.documents.length > 0) {
                        const coupon = couponRes.documents[0];
                        await databases.createDocument(dbId, couponUsagesCol, ID.unique(), {
                            coupon_id: coupon.$id,
                            user_id: request.user_id,
                            request_id: request.$id,
                            discount_applied: request.discount_amount || 0,
                            used_at: now.toISOString()
                        });
                        await databases.updateDocument(dbId, couponsCol, coupon.$id, {
                            total_uses: (coupon.total_uses || 0) + 1
                        });
                    }
                } catch (e) {
                    log(`Coupon logic failed: ${e.message}`);
                }
            }

            return res.json({ success: true, message: 'Approved successfully.' });

        } else if (action === 'reject') {
            // 1. Fetch request
            const request = await databases.getDocument(dbId, premiumReqCol, requestId);
            if (request.status !== 'pending') {
                return res.json({ success: false, error: 'Request is not pending.' }, 400);
            }

            if (!adminNote) {
                return res.json({ success: false, error: 'Admin note is required for rejection.' }, 400);
            }

            // Update request
            const now = new Date();
            await databases.updateDocument(dbId, premiumReqCol, request.$id, {
                status: 'rejected',
                reviewed_by: adminUserId,
                reviewed_at: now.toISOString(),
                admin_note: adminNote
            });

            return res.json({ success: true, message: 'Rejected successfully.' });

        } else if (action === 'cancel') {
            // 1. Fetch subscription
            const sub = await databases.getDocument(dbId, subsCol, subscriptionId);
            if (sub.status !== 'active') {
                return res.json({ success: false, error: 'Subscription is not active.' }, 400);
            }

            if (!cancellationReason) {
                return res.json({ success: false, error: 'Cancellation reason is required.' }, 400);
            }

            const now = new Date();
            
            // 2. Update subscription
            await databases.updateDocument(dbId, subsCol, sub.$id, {
                status: 'cancelled',
                cancelled_at: now.toISOString(),
                cancelled_by: adminUserId,
                cancellation_reason: cancellationReason
            });

            // 3. Update user
            const usersRes = await databases.listDocuments(dbId, usersCol, [
                `equal("auth_id", "${sub.user_id}")`
            ]);
            
            if (usersRes.documents.length > 0) {
                const userDocId = usersRes.documents[0].$id;
                await databases.updateDocument(dbId, usersCol, userDocId, {
                    is_premium: false,
                    current_plan: null,
                    premium_expires_at: null,
                    active_subscription_id: null,
                    updated_at: now.toISOString()
                });
            }

            return res.json({ success: true, message: 'Cancelled successfully.' });
        }

        return res.json({ success: false, error: 'Unknown action.' }, 400);

    } catch (err) {
        error(err.message);
        return res.json({ success: false, error: err.message }, 500);
    }
};
