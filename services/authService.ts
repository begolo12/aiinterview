
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { User, Division } from "../types";

// Default Users Data
const DEFAULT_USERS: User[] = [
  { username: 'irvan', name: 'Irvan', role: 'HR', division: Division.BUSDEV },
  { username: 'yoga', name: 'Yoga', role: 'MANAGER', division: Division.KEUANGAN },
  { username: 'muklis', name: 'Muklis', role: 'MANAGER', division: Division.OPERASI },
  { username: 'urip', name: 'Bpk. Urip', role: 'DIRECTOR' },
  { username: 'wahyu', name: 'Bpk. Wahyu', role: 'DIRECTOR' },
  { username: 'anggy', name: 'Ibu Anggy', role: 'CEO' }
];

export const seedUsers = async () => {
  try {
    for (const user of DEFAULT_USERS) {
      const userRef = doc(db, "users", user.username);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Create default user with password '123'
        await setDoc(userRef, {
          ...user,
          password: '123' 
        });
        console.log(`User ${user.username} seeded successfully.`);
      }
    }
  } catch (error) {
    console.error("Error seeding users (Check Firebase Rules):", error);
  }
};

export const loginUser = async (username: string, password: string): Promise<User | null> => {
  try {
    const userRef = doc(db, "users", username.toLowerCase().trim());
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data.password === password) {
        // Return user data without password
        const { password, ...userData } = data;
        return userData as User;
      } else {
        console.warn("Login failed: Incorrect password for", username);
      }
    } else {
      console.warn("Login failed: User not found:", username);
    }
    return null;
  } catch (error) {
    console.error("Login System Error:", error);
    // Return null so the UI handles it as a generic failure, but log it for dev
    return null;
  }
};

export const changePassword = async (username: string, newPassword: string): Promise<boolean> => {
  try {
    const userRef = doc(db, "users", username);
    await updateDoc(userRef, { password: newPassword });
    return true;
  } catch (error) {
    console.error("Change password error:", error);
    return false;
  }
};
