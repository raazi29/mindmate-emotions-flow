import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Loader2, User, Mail, Calendar, Settings, Bell, Shield, Palette, Save, LogOut } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  date_of_birth?: string;
  timezone?: string;
  language?: string;
  theme_preference?: string;
  email_notifications: boolean;
  push_notifications: boolean;
  analytics_enabled: boolean;
  created_at: string;
  updated_at: string;
}

const Account: React.FC = () => {
  const { user, signOut } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: 'en',
    theme_preference: 'system',
    email_notifications: true,
    push_notifications: true,
    analytics_enabled: true,
  });

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('public.profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          date_of_birth: data.date_of_birth || '',
          timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: data.language || 'en',
          theme_preference: data.theme_preference || 'system',
          email_notifications: data.email_notifications ?? true,
          push_notifications: data.push_notifications ?? true,
          analytics_enabled: data.analytics_enabled ?? true,
        });
      } else {
        // Create new profile if doesn't exist
        await createUserProfile();
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async () => {
    try {
      const newProfile = {
        user_id: user?.id,
        email: user?.primaryEmailAddress?.emailAddress,
        first_name: user?.firstName || '',
        last_name: user?.lastName || '',
        avatar_url: user?.imageUrl,
        ...formData,
      };

      const { data, error } = await supabase
        .from('public.profiles')
        .insert([newProfile])
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      toast({
        title: "Welcome!",
        description: "Your profile has been created",
      });
    } catch (error) {
      console.error('Error creating profile:', error);
      toast({
        title: "Error",
        description: "Failed to create user profile",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('public.profiles')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
            <p className="text-white/70">Manage your profile and preferences</p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Profile Information</CardTitle>
                  <CardDescription className="text-white/70">
                    Update your personal information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={user?.imageUrl} />
                      <AvatarFallback className="bg-purple-600 text-white">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {user?.firstName} {user?.lastName}
                      </h3>
                      <p className="text-white/70">{user?.primaryEmailAddress?.emailAddress}</p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name" className="text-white">First Name</Label>
                        <Input
                          id="first_name"
                          value={formData.first_name}
                          onChange={(e) => handleInputChange('first_name', e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name" className="text-white">Last Name</Label>
                        <Input
                          id="last_name"
                          value={formData.last_name}
                          onChange={(e) => handleInputChange('last_name', e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="date_of_birth" className="text-white">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor="timezone" className="text-white">Timezone</Label>
                      <select
                        id="timezone"
                        value={formData.timezone}
                        onChange={(e) => handleInputChange('timezone', e.target.value)}
                        className="w-full bg-white/10 border-white/20 text-white rounded-md px-3 py-2"
                      >
                        {Intl.supportedValuesOf('timeZone').map(tz => (
                          <option key={tz} value={tz} className="bg-gray-800 text-white">
                            {tz.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="language" className="text-white">Language</Label>
                      <select
                        id="language"
                        value={formData.language}
                        onChange={(e) => handleInputChange('language', e.target.value)}
                        className="w-full bg-white/10 border-white/20 text-white rounded-md px-3 py-2"
                      >
                        <option value="en" className="bg-gray-800 text-white">English</option>
                        <option value="es" className="bg-gray-800 text-white">Spanish</option>
                        <option value="fr" className="bg-gray-800 text-white">French</option>
                        <option value="de" className="bg-gray-800 text-white">German</option>
                      </select>
                    </div>
                  </div>

                  <Button
                    onClick={handleUpdateProfile}
                    disabled={saving}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Preferences</CardTitle>
                  <CardDescription className="text-white/70">
                    Customize your experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="theme_preference" className="text-white">Theme</Label>
                    <select
                      id="theme_preference"
                      value={formData.theme_preference}
                      onChange={(e) => handleInputChange('theme_preference', e.target.value)}
                      className="w-full bg-white/10 border-white/20 text-white rounded-md px-3 py-2"
                    >
                      <option value="system" className="bg-gray-800 text-white">System</option>
                      <option value="light" className="bg-gray-800 text-white">Light</option>
                      <option value="dark" className="bg-gray-800 text-white">Dark</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email_notifications" className="text-white">Email Notifications</Label>
                        <p className="text-sm text-white/70">Receive updates via email</p>
                      </div>
                      <Switch
                        id="email_notifications"
                        checked={formData.email_notifications}
                        onCheckedChange={(checked) => handleInputChange('email_notifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="push_notifications" className="text-white">Push Notifications</Label>
                        <p className="text-sm text-white/70">Get notified about important updates</p>
                      </div>
                      <Switch
                        id="push_notifications"
                        checked={formData.push_notifications}
                        onCheckedChange={(checked) => handleInputChange('push_notifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="analytics_enabled" className="text-white">Analytics</Label>
                        <p className="text-sm text-white/70">Help improve the app with usage data</p>
                      </div>
                      <Switch
                        id="analytics_enabled"
                        checked={formData.analytics_enabled}
                        onCheckedChange={(checked) => handleInputChange('analytics_enabled', checked)}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleUpdateProfile}
                    disabled={saving}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Preferences
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Privacy Settings</CardTitle>
                  <CardDescription className="text-white/70">
                    Control your data and privacy
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-white/5 rounded-lg">
                      <h4 className="font-semibold text-white mb-2">Data Usage</h4>
                      <p className="text-sm text-white/70 mb-2">
                        Your emotion data is encrypted and stored securely. We use it to provide personalized insights and recommendations.
                      </p>
                      <Button variant="outline" className="text-white border-white/20 hover:bg-white/10">
                        Download My Data
                      </Button>
                    </div>

                    <div className="p-4 bg-white/5 rounded-lg">
                      <h4 className="font-semibold text-white mb-2">Account Deletion</h4>
                      <p className="text-sm text-white/70 mb-2">
                        Permanently delete your account and all associated data.
                      </p>
                      <Button variant="destructive">
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Security</CardTitle>
                  <CardDescription className="text-white/70">
                    Manage your account security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div>
                        <h4 className="font-semibold text-white">Email Verified</h4>
                        <p className="text-sm text-white/70">{user?.primaryEmailAddress?.emailAddress}</p>
                      </div>
                      <Shield className="h-5 w-5 text-green-400" />
                    </div>

                    <Button
                      onClick={handleSignOut}
                      variant="outline"
                      className="w-full text-white border-white/20 hover:bg-white/10"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Account;