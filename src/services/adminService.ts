
import { User } from '../types';

/**
 * Service for administrative tasks that require server-side privileges
 */
export const adminService = {
  /**
   * Creates a new user in both Firebase Auth and Firestore
   */
  async createUser(userData: Partial<User>): Promise<User> {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    let result;
    const isJson = response.headers.get('content-type')?.includes('application/json');
    if (isJson) {
      result = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Server Error (${response.status}): ${text.substring(0, 100)}...`);
    }

    if (!response.ok) {
      throw new Error(result.error || `Failed to create user (Status: ${response.status})`);
    }
    return result.user;
  },

  /**
   * Updates a user's password directly without email confirmation
   */
  async updatePassword(uid: string, newPassword: string): Promise<void> {
    const response = await fetch(`/api/admin/users/${uid}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    });

    let result;
    const isJson = response.headers.get('content-type')?.includes('application/json');
    if (isJson) {
      result = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Server Error (${response.status}): ${text.substring(0, 100)}...`);
    }

    if (!response.ok) {
      throw new Error(result.error || `Failed to update password (Status: ${response.status})`);
    }
  },

  /**
   * Deletes a user from both Firebase Auth and marks as deleted in Firestore
   */
  async deleteUser(uid: string): Promise<void> {
    const response = await fetch(`/api/admin/users/${uid}`, {
      method: 'DELETE',
    });

    let result;
    const isJson = response.headers.get('content-type')?.includes('application/json');
    if (isJson) {
      result = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Server Error (${response.status}): ${text.substring(0, 100)}...`);
    }

    if (!response.ok) {
      throw new Error(result.error || `Failed to delete user (Status: ${response.status})`);
    }
  }
};
