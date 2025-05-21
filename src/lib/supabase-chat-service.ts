import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

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
  roomId: string;
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
export class SupabaseChatService {
  private userId: string | null = null;
  private userName: string | null = null;
  private userAvatar: string | null = null;
  private presenceChannel: RealtimeChannel | null = null;
  private roomChannels: Map<string, RealtimeChannel> = new Map();

  // Initialize the service with user info
  async initialize(userName: string, userAvatar: string): Promise<string> {
    try {
      console.log("SupabaseChatService: Starting initialization...");
      // Generate a UUID for anonymous users
      this.userId = uuidv4();
      this.userName = userName;
      this.userAvatar = userAvatar;
      
      console.log("SupabaseChatService: Creating anonymous session...");
      // Create anonymous session for this user
      await this.createAnonymousSession();
      
      console.log("SupabaseChatService: Checking Supabase connection...");
      // Test the Supabase connection
      try {
        const { data, error } = await supabase.from('_realtime').select('*').limit(1);
        if (error) {
          console.error("SupabaseChatService: Connection test error:", error);
        } else {
          console.log("SupabaseChatService: Connection to Supabase successful");
        }
      } catch (connError) {
        console.error("SupabaseChatService: Connection test failed:", connError);
      }
      
      console.log("SupabaseChatService: Initializing database tables...");
      // Initialize database tables if they don't exist
      await this.initializeTables();
      
      console.log("SupabaseChatService: Updating user presence...");
      // Update presence - don't fail if this errors due to RLS
      try {
        await this.updateUserPresence('online');
      } catch (presenceError) {
        console.error("SupabaseChatService: Presence update failed (will continue):", presenceError);
        // Continue anyway - don't let presence errors stop the initialization
      }
      
      console.log("SupabaseChatService: Subscribing to presence changes...");
      // Subscribe to presence changes
      this.subscribeToPresence();
      
      console.log("SupabaseChatService: Initialization complete with user ID:", this.userId);
      return this.userId;
    } catch (error) {
      console.error('SupabaseChatService: Error initializing chat service:', error);
      if (error instanceof Error) {
        console.error('SupabaseChatService: Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
    }
  }
  
  // Create anonymous session
  private async createAnonymousSession() {
    // Store user info in local storage
    localStorage.setItem('anonymousChatUserId', this.userId!);
    localStorage.setItem('anonymousChatUserName', this.userName!);
    localStorage.setItem('anonymousChatUserAvatar', this.userAvatar!);
  }
  
  // Initialize database tables if they don't exist
  private async initializeTables() {
    try {
      // Check if tables exist and create them if they don't
      // This is typically done with Supabase migrations, but we'll handle it here for simplicity
      
      // First, check if the rooms table exists
      const { error: roomsCheckError } = await supabase
        .from('anonymous_chat_rooms')
        .select('id')
        .limit(1);
        
      if (roomsCheckError) {
        // Check if this is a "table doesn't exist" error
        if (roomsCheckError.code === '42P01') {
          // Try to create tables using the RPC
          try {
            await supabase.rpc('create_anonymous_chat_tables');
            
            // Also try to create policies, but don't fail if this errors
            try {
              await supabase.rpc('set_anonymous_chat_policies');
            } catch (policyError) {
              console.error("Failed to set up policies:", policyError);
              // Continue anyway
            }
            
            // Try to enable realtime
            try {
              await supabase.rpc('create_anonymous_chat_publications');
            } catch (realtimeError) {
              console.error("Failed to enable realtime:", realtimeError);
              // Continue anyway
            }
          } catch (createError) {
            console.error("Failed to create tables via RPC:", createError);
            throw new Error(`Database tables don't exist. Please go to "/chat/setup" to set up the database.`);
          }
        } else {
          // Some other error
          console.error("Error checking tables:", roomsCheckError);
          throw new Error(`Database error: ${roomsCheckError.message}`);
        }
      }
    } catch (error) {
      console.error('Error initializing tables:', error);
      throw error;
    }
  }
  
  // Update user presence
  async updateUserPresence(status: 'online' | 'away' | 'busy' | 'offline'): Promise<void> {
    if (!this.userId) throw new Error('User not initialized');
    
    try {
      const presence: UserPresence = {
        id: this.userId,
        name: this.userName!,
        avatar: this.userAvatar!,
        status,
        lastActive: Date.now()
      };
      
      // Update or insert presence
      const { error } = await supabase
        .from('anonymous_chat_presence')
        .upsert({
          user_id: presence.id,
          username: presence.name,
          avatar: presence.avatar,
          status: presence.status,
          last_active: new Date(presence.lastActive).toISOString()
        }, {
          onConflict: 'user_id'
        });
        
      if (error) {
        // Check if this is an RLS policy violation
        if (error.code === '42501' || error.message.includes('violates row-level security policy')) {
          console.error('RLS policy error:', error);
          console.warn('Continuing despite RLS error - fix your RLS policies for chat tables');
          // Don't throw, just continue
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error updating user presence:', error);
      // Don't fail fatally on presence errors, just log them
      console.warn('Continuing despite presence error');
    }
  }
  
  // Subscribe to presence channel
  private subscribeToPresence() {
    this.presenceChannel = supabase
      .channel('anonymous_chat_presence')
      .on('presence', { event: 'sync' }, () => {
        // Handle presence sync
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        // Handle join
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // Handle leave
      })
      .subscribe();
  }
  
  // Get all available rooms
  async getRooms(): Promise<Room[]> {
    try {
      const { data, error } = await supabase
        .from('anonymous_chat_rooms')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        mood: room.mood,
        topic: room.topic,
        createdAt: new Date(room.created_at).getTime(),
        createdBy: room.created_by,
        lastActivity: room.last_activity ? new Date(room.last_activity).getTime() : undefined,
        isPrivate: room.is_private
      }));
    } catch (error) {
      console.error('Error getting rooms:', error);
      throw error;
    }
  }
  
  // Create a new room
  async createRoom(roomData: Omit<Room, 'id' | 'createdAt' | 'createdBy'>): Promise<Room> {
    if (!this.userId) throw new Error('User not initialized');
    
    try {
      const now = new Date().toISOString();
      const roomId = uuidv4();
      
      // Insert room
      const { error } = await supabase
        .from('anonymous_chat_rooms')
        .insert({
          id: roomId,
          name: roomData.name,
          description: roomData.description,
          mood: roomData.mood,
          topic: roomData.topic,
          created_at: now,
          created_by: this.userId,
          last_activity: now,
          is_private: roomData.isPrivate || false
        });
        
      if (error) throw error;
      
      // Add system message about room creation
      await this.sendMessage(roomId, {
        content: `Room "${roomData.name}" was created`,
        type: 'system'
      });
      
      // Return the new room
      return {
        id: roomId,
        name: roomData.name,
        description: roomData.description,
        mood: roomData.mood,
        topic: roomData.topic,
        createdAt: new Date(now).getTime(),
        createdBy: this.userId,
        lastActivity: new Date(now).getTime(),
        isPrivate: roomData.isPrivate || false
      };
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }
  
  // Get messages for a room
  async getMessages(roomId: string, limit = 50): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('anonymous_chat_messages')
        .select('*, anonymous_chat_message_attachments(*), anonymous_chat_message_reactions(*)')
        .eq('room_id', roomId)
        .order('timestamp', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      
      // Process the messages with their attachments and reactions
      return (data || []).map(msg => {
        // Process attachments
        const attachments = msg.anonymous_chat_message_attachments?.map(att => ({
          id: att.id,
          type: att.type,
          url: att.url,
          name: att.name,
          size: att.size,
          contentType: att.content_type
        }));
        
        // Process reactions
        const reactions: Record<string, { emoji: string; users: string[] }> = {};
        msg.anonymous_chat_message_reactions?.forEach(reaction => {
          if (!reactions[reaction.emoji]) {
            reactions[reaction.emoji] = {
              emoji: reaction.emoji,
              users: []
            };
          }
          reactions[reaction.emoji].users.push(reaction.user_id);
        });
        
        return {
          id: msg.id,
          senderId: msg.sender_id,
          senderName: msg.sender_name,
          senderAvatar: msg.sender_avatar,
          content: msg.content,
          timestamp: new Date(msg.timestamp).getTime(),
          type: msg.type as MessageType,
          roomId: msg.room_id,
          attachments: attachments?.length ? attachments : undefined,
          replyTo: msg.reply_to,
          isEdited: msg.is_edited,
          reactions: Object.keys(reactions).length ? reactions : undefined,
          isDeleted: msg.is_deleted
        };
      });
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }
  
  // Listen for new messages in a room
  listenToMessages(roomId: string, callback: (messages: Message[]) => void): () => void {
    // First get all messages
    this.getMessages(roomId).then(messages => {
      callback(messages);
    }).catch(console.error);
    
    // Then set up real-time subscription
    const channel = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'anonymous_chat_messages',
        filter: `room_id=eq.${roomId}`
      }, payload => {
        // Refresh messages after any changes
        this.getMessages(roomId).then(messages => {
          callback(messages);
        }).catch(console.error);
      })
      .subscribe();
      
    // Save the channel for cleanup
    this.roomChannels.set(roomId, channel);
    
    // Return unsubscribe function
    return () => {
      channel.unsubscribe();
      this.roomChannels.delete(roomId);
    };
  }
  
  // Listen for active users
  listenToActiveUsers(callback: (users: UserPresence[]) => void): () => void {
    // First get all active users
    this.getActiveUsers().then(users => {
      callback(users);
    }).catch(console.error);
    
    // Then set up real-time subscription
    const channel = supabase
      .channel('presence-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'anonymous_chat_presence'
      }, payload => {
        // Refresh users after any changes
        this.getActiveUsers().then(users => {
          callback(users);
        }).catch(console.error);
      })
      .subscribe();
      
    // Return unsubscribe function
    return () => {
      channel.unsubscribe();
    };
  }
  
  // Get active users
  private async getActiveUsers(): Promise<UserPresence[]> {
    try {
      const { data, error } = await supabase
        .from('anonymous_chat_presence')
        .select('*')
        .order('last_active', { ascending: false });
      
      if (error) throw error;
      
      // Filter out users who haven't been active in the last 5 minutes and mark them as offline
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      return (data || []).map(user => ({
        id: user.user_id,
        name: user.username,
        avatar: user.avatar,
        status: new Date(user.last_active) < new Date(fiveMinutesAgo) ? 'offline' : user.status as 'online' | 'away' | 'busy' | 'offline',
        lastActive: new Date(user.last_active).getTime()
      }));
    } catch (error) {
      console.error('Error getting active users:', error);
      return [];
    }
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
      const now = new Date().toISOString();
      const messageId = uuidv4();
      
      // Process attachments if any
      let attachments: Attachment[] | undefined;
      
      if (messageData.attachments && messageData.attachments.length > 0) {
        attachments = await Promise.all(
          messageData.attachments.map(async (file) => {
            const fileId = uuidv4();
            const filePath = `chat-attachments/${roomId}/${fileId}-${file.name}`;
            
            // Upload file to Supabase Storage
            const { error: uploadError, data: uploadData } = await supabase
              .storage
              .from('anonymous-chat-files')
              .upload(filePath, file);
              
            if (uploadError) throw uploadError;
            
            // Get the URL
            const { data: urlData } = supabase
              .storage
              .from('anonymous-chat-files')
              .getPublicUrl(filePath);
              
            // Determine attachment type
            let type: 'image' | 'file' | 'audio' = 'file';
            if (file.type.startsWith('image/')) type = 'image';
            if (file.type.startsWith('audio/')) type = 'audio';
            
            return {
              id: fileId,
              type,
              url: urlData.publicUrl,
              name: file.name,
              size: file.size,
              contentType: file.type
            };
          })
        );
      }
      
      // Insert message
      const { error } = await supabase
        .from('anonymous_chat_messages')
        .insert({
          id: messageId,
          room_id: roomId,
          sender_id: this.userId,
          sender_name: this.userName,
          sender_avatar: this.userAvatar,
          content: messageData.content,
          timestamp: now,
          type: messageData.type || 'text',
          reply_to: messageData.replyTo,
          is_edited: false,
          is_deleted: false
        });
        
      if (error) throw error;
      
      // Insert attachments if any
      if (attachments && attachments.length > 0) {
        const attachmentRecords = attachments.map(att => ({
          id: att.id,
          message_id: messageId,
          type: att.type,
          url: att.url,
          name: att.name,
          size: att.size,
          content_type: att.contentType
        }));
        
        const { error: attachmentsError } = await supabase
          .from('anonymous_chat_message_attachments')
          .insert(attachmentRecords);
          
        if (attachmentsError) throw attachmentsError;
      }
      
      // Update room last activity
      const { error: roomUpdateError } = await supabase
        .from('anonymous_chat_rooms')
        .update({ last_activity: now })
        .eq('id', roomId);
        
      if (roomUpdateError) throw roomUpdateError;
      
      // Return the new message
      return {
        id: messageId,
        senderId: this.userId,
        senderName: this.userName,
        senderAvatar: this.userAvatar || '😊',
        content: messageData.content,
        timestamp: new Date(now).getTime(),
        type: messageData.type || 'text',
        roomId,
        attachments,
        replyTo: messageData.replyTo,
        isEdited: false,
        isDeleted: false
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
      // First check if the user is the sender
      const { data: message, error: messageError } = await supabase
        .from('anonymous_chat_messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();
        
      if (messageError) throw messageError;
      
      if (message.sender_id !== this.userId) {
        throw new Error('Not authorized to edit this message');
      }
      
      // Update the message
      const { error } = await supabase
        .from('anonymous_chat_messages')
        .update({
          content,
          is_edited: true
        })
        .eq('id', messageId);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }
  
  // Delete a message
  async deleteMessage(roomId: string, messageId: string): Promise<void> {
    if (!this.userId) throw new Error('User not initialized');
    
    try {
      // First check if the user is the sender
      const { data: message, error: messageError } = await supabase
        .from('anonymous_chat_messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();
        
      if (messageError) throw messageError;
      
      if (message.sender_id !== this.userId) {
        throw new Error('Not authorized to delete this message');
      }
      
      // Mark as deleted (soft delete)
      const { error } = await supabase
        .from('anonymous_chat_messages')
        .update({
          content: 'This message has been deleted',
          is_deleted: true
        })
        .eq('id', messageId);
        
      if (error) throw error;
      
      // Delete attachments
      await supabase
        .from('anonymous_chat_message_attachments')
        .delete()
        .eq('message_id', messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
  
  // Add reaction to a message
  async addReaction(roomId: string, messageId: string, emoji: string): Promise<void> {
    if (!this.userId) throw new Error('User not initialized');
    
    try {
      // Check if the user already reacted with this emoji
      const { data: existingReaction, error: checkError } = await supabase
        .from('anonymous_chat_message_reactions')
        .select('*')
        .eq('message_id', messageId)
        .eq('user_id', this.userId)
        .eq('emoji', emoji)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      if (existingReaction) {
        // User already reacted, remove the reaction
        const { error: deleteError } = await supabase
          .from('anonymous_chat_message_reactions')
          .delete()
          .eq('id', existingReaction.id);
          
        if (deleteError) throw deleteError;
      } else {
        // Add new reaction
        const { error: insertError } = await supabase
          .from('anonymous_chat_message_reactions')
          .insert({
            message_id: messageId,
            user_id: this.userId,
            emoji
          });
          
        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }
  
  // Leave a room (delete if creator and no other messages)
  async leaveRoom(roomId: string): Promise<void> {
    if (!this.userId) throw new Error('User not initialized');
    
    try {
      // Send system message that user left
      await this.sendMessage(roomId, {
        content: `${this.userName} left the room`,
        type: 'system'
      });
      
      // Check if user is the creator
      const { data: room, error: roomError } = await supabase
        .from('anonymous_chat_rooms')
        .select('created_by')
        .eq('id', roomId)
        .single();
        
      if (roomError) throw roomError;
      
      if (room.created_by === this.userId) {
        // Count messages
        const { count, error: countError } = await supabase
          .from('anonymous_chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', roomId);
          
        if (countError) throw countError;
        
        // If only system messages or very few messages, delete the room
        if (!count || count <= 5) {
          // Get message IDs first
          const { data: messageIds, error: messageIdsError } = await supabase
            .from('anonymous_chat_messages')
            .select('id')
            .eq('room_id', roomId);
            
          if (messageIdsError) throw messageIdsError;
          
          const msgIds = messageIds.map(m => m.id);
          
          // Delete reactions for these messages
          if (msgIds.length > 0) {
            const { error: reactionsError } = await supabase
              .from('anonymous_chat_message_reactions')
              .delete()
              .in('message_id', msgIds);
              
            if (reactionsError) throw reactionsError;
            
            // Delete attachments for these messages
            const { error: attachmentsError } = await supabase
              .from('anonymous_chat_message_attachments')
              .delete()
              .in('message_id', msgIds);
              
            if (attachmentsError) throw attachmentsError;
          }
          
          // Delete messages
          const { error: messagesError } = await supabase
            .from('anonymous_chat_messages')
            .delete()
            .eq('room_id', roomId);
            
          if (messagesError) throw messagesError;
          
          // Finally delete the room
          const { error: roomDeleteError } = await supabase
            .from('anonymous_chat_rooms')
            .delete()
            .eq('id', roomId);
            
          if (roomDeleteError) throw roomDeleteError;
        }
      }
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    }
  }
  
  // Cleanup: unsubscribe from all channels
  cleanup(): void {
    // Unsubscribe from all room channels
    this.roomChannels.forEach(channel => {
      channel.unsubscribe();
    });
    this.roomChannels.clear();
    
    // Unsubscribe from presence channel
    if (this.presenceChannel) {
      this.presenceChannel.unsubscribe();
      this.presenceChannel = null;
    }
    
    // Set status to offline
    if (this.userId) {
      this.updateUserPresence('offline').catch(console.error);
    }
  }
}

// Export singleton instance
export const chatService = new SupabaseChatService(); 