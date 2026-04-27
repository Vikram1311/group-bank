import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { Transaction } from "../types";

export function listenTransactions(callback: (transactions: Transaction[]) => void): () => void {
  return onSnapshot(collection(db, "transactions"), (snapshot) => {
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    callback(list);
  });
}
