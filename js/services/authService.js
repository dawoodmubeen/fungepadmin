import { account, databases, CONFIG, Query } from '../appwrite/config.js';

class AuthService {
    async getCurrentUser() {
        try {
            return await account.get();
        } catch (error) {
            return null;
        }
    }

    async getAdminDocument(userId) {
        try {
            const response = await databases.listDocuments(
                CONFIG.databaseId, 
                CONFIG.usersCol, 
                [Query.equal('auth_id', userId)]
            );
            
            if (response.documents.length > 0) {
                const userDoc = response.documents[0];
                // Check if the user has an admin role
                const role = (userDoc.role || '').toLowerCase();
                if (role === 'admin' || role === 'administrator') {
                    return userDoc;
                }
            }
            return null;
        } catch (error) {
            console.error("Error fetching admin document:", error);
            return null;
        }
    }

    async loginWithGoogle() {
        try {
            const redirectUrl = `${window.location.origin}${window.location.pathname}`;
            account.createOAuth2Session('google', redirectUrl, redirectUrl);
        } catch (error) {
            console.error("Google login error:", error);
            throw error;
        }
    }

    async logout() {
        try {
            await account.deleteSession('current');
            window.location.reload();
        } catch (error) {
            console.error("Logout error:", error);
            throw error;
        }
    }
}

export const authService = new AuthService();
