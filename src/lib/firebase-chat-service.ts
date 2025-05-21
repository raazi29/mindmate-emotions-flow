import { ref, set, push, onValue, off, update, remove, serverTimestamp, get, query, orderByChild, limitToLast } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, database, storage } from './firebase-config';
import { v4 as uuidv4 } from 'uuid';
import { signInAnonymously } from 'firebase/auth';

// Type definitions for our chat system
export type MessageType = 'text' | 'image' | 'notification' | 'system';

export type Attachment = {
  id: string;
  type: 'image' | 'file' | 'audio';
  url: string;
  name: string;
  size?: number;
  contentType?: string;
};

export type Message = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: number;
  type: MessageType;
  attachments?: Attachment[];
  replyTo?: string;
  isEdited?: boolean;
  reactions?: Record<string, { emoji: string; users: string[] }>;
  isDeleted?: boolean;
  isOffline?: boolean;
};

export type Room = {
  id: string;
  name: string;
  description: string;
  mood: string;
  topic?: string;
  createdAt: number;
  createdBy: string;
  lastActivity?: number;
  isPrivate?: boolean;
};

export type UserPresence = {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastActive: number;
};

// Chat service class
export class FirebaseChatService {
  private userId: string | null = null;
  private userName: string | null = null;
  private userAvatar: string | null = null;
  private unsubscribers: (() => void)[] = [];

  // Initialize the service with user info
  async initialize(userName: string, userAvatar: string): Promise<string> {
    try {
      // Sign in anonymously if not already signed in
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      
      // Set user info
      this.userId = auth.currentUser?.uid || uuidv4();
      this.userName = userName;
      this.userAvatar = userAvatar;
      
      // Update presence
      await this.updateUserPresence('online');
      
      // Setup presence disconnect hook
      const userPresenceRef = ref(database, `presence/${this.userId}`);
      const connectedRef = ref(database, '.info/connected');
      
      onValue(connectedRef, (snapshot) => {
        if (snapshot.val() === true) {
          // User is online
          update(userPresenceRef, {
            status: 'online',
            lastActive: serverTimestamp()
          });
          
          // Set up disconnect handler
          onValue(userPresenceRef, async (presenceSnapshot) => {
            if (presenceSnapshot.exists()) {
              await update(userPresenceRef, {
                status: 'offline',
                lastActive: serverTimestamp()
              });
            }
          }, { onlyOnce: true });
        }
      });
      
      // Add cleanup for unsubscribe
      this.addUnsubscriber(() => {
        off(connectedRef);
        off(userPresenceRef);
      });
      
      return this.userId;
    } catch (error) {
      console.error('Error initializing chat service:', error);
      throw error;
    }
  }
  
  // Update user presence
  async updateUserPresence(status: 'online' | 'away' | 'busy' | 'offline'): Promise<void> {
    if (!this.userId) throw new Error('User not initialized');
    
    try {
      const userPresenceRef = ref(database, `presence/${this.userId}`);
      await set(userPresenceRef, {
        id: this.userId,
        name: this.userName,
        avatar: this.userAvatar,
        status,
        lastActive: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user presence:', error);
      throw error;
    }
  }
  
  // Get all available rooms
  async getRooms(): Promise<Room[]> {
    try {
      const roomsRef = ref(database, 'rooms');
      const snapshot = await get(roomsRef);
      
      if (!snapshot.exists()) return [];
      
      const rooms: Room[] = [];
      snapshot.forEach((childSnapshot) => {
        rooms.push({
          id: childSnapshot.key as string,
          ...(childSnapshot.val() as Omit<Room, 'id'>)
        });
      });
      
      return rooms;
    } catch (error) {
      console.error('Error getting rooms:', error);
      throw error;
    }
  }
  
  // Create a new room
  async createRoom(roomData: Omit<Room, 'id' | 'createdAt' | 'createdBy'>): Promise<Room> {
    if (!this.userId) throw new Error('User not initialized');
    
    try {
      const roomsRef = ref(database, 'rooms');
      const newRoomRef = push(roomsRef);
      const roomId = newRoomRef.key as string;
      
      const newRoom: Omit<Room, 'id'> = {
        ...roomData,
        createdAt: Date.now(),
        createdBy: this.userId,
        lastActivity: Date.now()
      };
      
      await set(newRoomRef, newRoom);
      
      // Add system message about room creation
      await this.sendMessage(roomId, {
        content: `Room "${roomData.name}" was created`,
        type: 'system'
      });
      
      return {
        id: roomId,
        ...newRoom
      };
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }
  
  // Get messages for a room
  async getMessages(roomId: string, limit = 50): Promise<Message[]> {
    try {
      const messagesRef = query(
        ref(database, `messages/${roomId}`),
        orderByChild('timestamp'),
        limitToLast(limit)
      );
      
      const snapshot = await get(messagesRef);
      
      if (!snapshot.exists()) return [];
      
      const messages: Message[] = [];
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key as string,
          ...(childSnapshot.val() as Omit<Message, 'id'>)
        });
      });
      
      return messages.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }
  
  // Listen for new messages in a room
  listenToMessages(roomId: string, callback: (messages: Message[]) => void): () => void {
    const messagesRef = query(
      ref(database, `messages/${roomId}`),
      orderByChild('timestamp')
    );
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      
      const messages: Message[] = [];
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key as string,
          ...(childSnapshot.val() as Omit<Message, 'id'>)
        });
      });
      
      callback(messages.sort((a, b) => a.timestamp - b.timestamp));
    });
    
    // Add to unsubscribers for cleanup
    this.addUnsubscriber(unsubscribe);
    
    return unsubscribe;
  }
  
  // Listen for active users in a room
  listenToActiveUsers(callback: (users: UserPresence[]) => void): () => void {
    const presenceRef = ref(database, 'presence');
    
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      
      const users: UserPresence[] = [];
      snapshot.forEach((childSnapshot) => {
        users.push(childSnapshot.val() as UserPresence);
      });
      
      callback(users);
    });
    
    // Add to unsubscribers for cleanup
    this.addUnsubscriber(unsubscribe);
    
    return unsubscribe;
  }
  
  // Send a message
  async sendMessage(roomId: string, messageData: { 
    content: string; 
    type?: MessageType; 
    attachments?: File[];
    replyTo?: string;
  }): Promise<Message> {
    if (!this.userId || !this.userName) throw new Error('User not initialized');
    
    try {
      // Process attachments if any
      let attachmentsData: Attachment[] | undefined;
      
      if (messageData.attachments && messageData.attachments.length > 0) {
        attachmentsData = await Promise.all(
          messageData.attachments.map(async (file) => {
            const fileId = uuidv4();
            const fileRef = storageRef(storage, `chat-attachments/${roomId}/${fileId}-${file.name}`);
            
            // Upload file
            await uploadBytes(fileRef, file);
            
            // Get download URL
            const downloadUrl = await getDownloadURL(fileRef);
            
            // Determine attachment type
            let type: 'image' | 'file' | 'audio' = 'file';
            if (file.type.startsWith('image/')) type = 'image';
            if (file.type.startsWith('audio/')) type = 'audio';
            
            return {
              id: fileId,
              type,
              url: downloadUrl,
              name: file.name,
              size: file.size,
              contentType: file.type
            };
          })
        );
      }
      
      // Create message object
      const messagesRef = ref(database, `messages/${roomId}`);
      const newMessageRef = push(messagesRef);
      const messageId = newMessageRef.key as string;
      
      const message: Omit<Message, 'id'> = {
        senderId: this.userId,
        senderName: this.userName,
        senderAvatar: this.userAvatar || '😊',
        content: messageData.content,
        timestamp: Date.now(),
        type: messageData.type || 'text',
        attachments: attachmentsData,
        replyTo: messageData.replyTo,
      };
      
      // Save message
      await set(newMessageRef, message);
      
      // Update room last activity
      await update(ref(database, `rooms/${roomId}`), {
        lastActivity: Date.now()
      });
      
      return {
        id: messageId,
        ...message
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
  
  // Edit a message
  async editMessage(roomId: string, messageId: string, content: string): Promise<void> {
    if (!this.userId) throw new Error('User not initialized');
    
    try {
      const messageRef = ref(database, `messages/${roomId}/${messageId}`);
      const snapshot = await get(messageRef);
      
      if (!snapshot.exists()) throw new Error('Message not found');
      
      const message = snapshot.val() as Message;
      
      // Only the sender can edit their message
      if (message.senderId !== this.userId) {
        throw new Error('Not authorized to edit this message');
      }
      
      await update(messageRef, {
        content,
        isEdited: true
      });
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }
  
  // Delete a message
  async deleteMessage(roomId: string, messageId: string): Promise<void> {
    if (!this.userId) throw new Error('User not initialized');
    
    try {
      const messageRef = ref(database, `messages/${roomId}/${messageId}`);
      const snapshot = await get(messageRef);
      
      if (!snapshot.exists()) throw new Error('Message not found');
      
      const message = snapshot.val() as Message;
      
      // Only the sender can delete their message
      if (message.senderId !== this.userId) {
        throw new Error('Not authorized to delete this message');
      }
      
      // Mark as deleted instead of completely removing
      await update(messageRef, {
        content: 'This message has been deleted',
        attachments: null,
        isDeleted: true
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
  
  // Add reaction to a message
  async addReaction(roomId: string, messageId: string, emoji: string): Promise<void> {
    if (!this.userId) throw new Error('User not initialized');
    
    try {
      const messageRef = ref(database, `messages/${roomId}/${messageId}`);
      const snapshot = await get(messageRef);
      
      if (!snapshot.exists()) throw new Error('Message not found');
      
      const message = snapshot.val() as Message;
      const reactions = message.reactions || {};
      
      if (reactions[emoji]) {
        // Reaction exists - toggle user
        const userIndex = reactions[emoji].users.indexOf(this.userId);
        
        if (userIndex > -1) {
          // Remove user's reaction
          reactions[emoji].users.splice(userIndex, 1);
          
          // Remove reaction completely if no users left
          if (reactions[emoji].users.length === 0) {
            delete reactions[emoji];
          }
        } else {
          // Add user's reaction
          reactions[emoji].users.push(this.userId);
        }
      } else {
        // Create new reaction
        reactions[emoji] = {
          emoji,
          users: [this.userId]
        };
      }
      
      await update(messageRef, { reactions });
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }
  
  // Leave a room (delete if creator and no other messages)
  async leaveRoom(roomId: string): Promise<void> {
    if (!this.userId) throw new Error('User not initialized');
    
    try {
      const roomRef = ref(database, `rooms/${roomId}`);
      const roomSnapshot = await get(roomRef);
      
      if (!roomSnapshot.exists()) throw new Error('Room not found');
      
      const room = roomSnapshot.val() as Room;
      
      // Send system message that user left
      await this.sendMessage(roomId, {
        content: `${this.userName} left the room`,
        type: 'system'
      });
      
      // If user is the creator, check if we should delete the room
      if (room.createdBy === this.userId) {
        const messagesRef = ref(database, `messages/${roomId}`);
        const messagesSnapshot = await get(messagesRef);
        
        // If only system messages or very few messages, delete the room
        if (!messagesSnapshot.exists() || messagesSnapshot.size <= 5) {
          await remove(roomRef);
          await remove(messagesRef);
        }
      }
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    }
  }
  
  // Cleanup: unsubscribe from all listeners
  cleanup(): void {
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
    
    // Set status to offline
    if (this.userId) {
      this.updateUserPresence('offline').catch(console.error);
    }
  }
  
  // Utility to add unsubscriber for cleanup
  private addUnsubscriber(unsubscribe: () => void): void {
    this.unsubscribers.push(unsubscribe);
  }
}

// Export singleton instance
export const chatService = new FirebaseChatService(); 