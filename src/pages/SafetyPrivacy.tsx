import { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  Bell, 
  Download, 
  Trash2, 
  LogOut, 
  Clock,
  FileText,
  User,
  Key,
  RefreshCw,
  Check,
  Info,
  AlertCircle,
  Save,
  Cloud,
  MessageCircle
} from "lucide-react";
import Navbar from "@/components/Navbar";

const SafetyPrivacy = () => {
  const [privacySettings, setPrivacySettings] = useState({
    shareData: false,
    allowAnalytics: true,
    allowNotifications: true,
    allowEmails: false,
    passwordProtect: true,
    encryptJournals: true,
    anonymizeData: true,
    autoLogout: true,
    autoLogoutTime: 15,
    showOnlineStatus: false
  });

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [password, setPassword] = useState("************");
  const [privacyScore, setPrivacyScore] = useState(85);

  const handleSettingChange = (setting: keyof typeof privacySettings, value: any) => {
    setPrivacySettings({
      ...privacySettings,
      [setting]: value
    });

    // Calculate new privacy score based on selected settings
    setTimeout(() => {
      let newScore = 50; // Base score
      
      // Add points for security enhancing settings
      if (!privacySettings.shareData) newScore += 5;
      if (!privacySettings.allowAnalytics) newScore += 5;
      if (privacySettings.passwordProtect) newScore += 10;
      if (privacySettings.encryptJournals) newScore += 10;
      if (privacySettings.anonymizeData) newScore += 5;
      if (privacySettings.autoLogout) newScore += 5;
      if (!privacySettings.showOnlineStatus) newScore += 5;
      
      setPrivacyScore(Math.min(newScore, 100));
    }, 300);
  };

  const handleAutoLogoutTimeChange = (time: number) => {
    setPrivacySettings({
      ...privacySettings,
      autoLogoutTime: time
    });
  };

  const getScoreColor = () => {
    if (privacyScore >= 80) return "text-green-500";
    if (privacyScore >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto pt-24 pb-10 px-4">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Safety & Privacy</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Privacy Score Card */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Score</CardTitle>
                  <CardDescription>Your current privacy and security level</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center pb-6">
                  <div className="relative w-40 h-40 mb-4">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle
                        className="text-muted-foreground/20"
                        strokeWidth="10"
                        stroke="currentColor"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                      />
                      <circle
                        className="text-primary"
                        strokeWidth="10"
                        strokeDasharray={`${(privacyScore / 100) * 251.2} 251.2`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-4xl font-bold ${getScoreColor()}`}>{privacyScore}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-medium mb-1">
                      {privacyScore >= 80 ? "Very Good" : privacyScore >= 60 ? "Good" : "Needs Improvement"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {privacyScore >= 80 
                        ? "Your privacy settings are well-configured" 
                        : "You can improve your privacy by adjusting settings"}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col">
                  <div className="grid grid-cols-3 w-full text-center text-sm">
                    <div className="flex flex-col items-center">
                      <Badge variant="outline" className="mb-1">Security</Badge>
                      <span className={privacySettings.passwordProtect ? "text-green-500" : "text-red-500"}>
                        {privacySettings.passwordProtect ? "Active" : "At Risk"}
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Badge variant="outline" className="mb-1">Encryption</Badge>
                      <span className={privacySettings.encryptJournals ? "text-green-500" : "text-red-500"}>
                        {privacySettings.encryptJournals ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Badge variant="outline" className="mb-1">Data</Badge>
                      <span className={!privacySettings.shareData ? "text-green-500" : "text-red-500"}>
                        {!privacySettings.shareData ? "Private" : "Shared"}
                      </span>
                    </div>
                  </div>
                </CardFooter>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Emergency Actions</CardTitle>
                  <CardDescription>Quick safety actions for your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <Button variant="outline" className="flex items-center justify-start text-left h-auto py-4">
                      <LogOut className="h-4 w-4 mr-3" />
                      <div>
                        <p className="font-medium mb-1">Log Out Everywhere</p>
                        <p className="text-xs text-muted-foreground">Sign out from all devices and sessions</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="flex items-center justify-start text-left h-auto py-4">
                      <Download className="h-4 w-4 mr-3" />
                      <div>
                        <p className="font-medium mb-1">Download Your Data</p>
                        <p className="text-xs text-muted-foreground">Get a copy of all your personal information</p>
                      </div>
                    </Button>
                    <Button variant="destructive" className="flex items-center justify-start text-left h-auto py-4">
                      <Trash2 className="h-4 w-4 mr-3" />
                      <div>
                        <p className="font-medium mb-1">Delete Account</p>
                        <p className="text-xs">Remove all your data and account permanently</p>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Settings Tabs */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy & Security Settings</CardTitle>
                  <CardDescription>Control how your data is used and protected</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="privacy">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                      <TabsTrigger value="privacy" className="flex items-center gap-1">
                        <Eye className="h-4 w-4" /> Privacy
                      </TabsTrigger>
                      <TabsTrigger value="security" className="flex items-center gap-1">
                        <Lock className="h-4 w-4" /> Security
                      </TabsTrigger>
                      <TabsTrigger value="data" className="flex items-center gap-1">
                        <FileText className="h-4 w-4" /> Data
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="privacy" className="space-y-4">
                      <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <Label className="font-medium">Share Your Data for Research</Label>
                          <p className="text-xs text-muted-foreground">Allow anonymous data to be used for improving mental health research</p>
                        </div>
                        <Switch 
                          checked={privacySettings.shareData}
                          onCheckedChange={(checked) => handleSettingChange('shareData', checked)}
                        />
                      </div>
                      <Separator />
                      
                      <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <Label className="font-medium">Allow Usage Analytics</Label>
                          <p className="text-xs text-muted-foreground">Collect anonymous usage data to improve the app</p>
                        </div>
                        <Switch 
                          checked={privacySettings.allowAnalytics}
                          onCheckedChange={(checked) => handleSettingChange('allowAnalytics', checked)}
                        />
                      </div>
                      <Separator />
                      
                      <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <Label className="font-medium">Allow Push Notifications</Label>
                          <p className="text-xs text-muted-foreground">Receive notifications for new messages and reminders</p>
                        </div>
                        <Switch 
                          checked={privacySettings.allowNotifications}
                          onCheckedChange={(checked) => handleSettingChange('allowNotifications', checked)}
                        />
                      </div>
                      <Separator />
                      
                      <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <Label className="font-medium">Allow Email Communications</Label>
                          <p className="text-xs text-muted-foreground">Receive email updates and newsletters</p>
                        </div>
                        <Switch 
                          checked={privacySettings.allowEmails}
                          onCheckedChange={(checked) => handleSettingChange('allowEmails', checked)}
                        />
                      </div>
                      <Separator />
                      
                      <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <Label className="font-medium">Show Online Status</Label>
                          <p className="text-xs text-muted-foreground">Allow others to see when you're active in chatrooms</p>
                        </div>
                        <Switch 
                          checked={privacySettings.showOnlineStatus}
                          onCheckedChange={(checked) => handleSettingChange('showOnlineStatus', checked)}
                        />
                      </div>
                      <Separator />
                      
                      <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <Label className="font-medium">Anonymize User Data</Label>
                          <p className="text-xs text-muted-foreground">Use pseudonyms and anonymize data where possible</p>
                        </div>
                        <Switch 
                          checked={privacySettings.anonymizeData}
                          onCheckedChange={(checked) => handleSettingChange('anonymizeData', checked)}
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="security" className="space-y-4">
                      <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <Label className="font-medium">Password Protection</Label>
                          <p className="text-xs text-muted-foreground">Require password to access sensitive areas</p>
                        </div>
                        <Switch 
                          checked={privacySettings.passwordProtect}
                          onCheckedChange={(checked) => handleSettingChange('passwordProtect', checked)}
                        />
                      </div>
                      <Separator />
                      
                      <div className="py-2">
                        <Label className="font-medium mb-2 block">Change Password</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-grow">
                            <Input 
                              type={passwordVisible ? "text" : "password"} 
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="pr-10"
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="absolute right-0 top-0"
                              onClick={() => setPasswordVisible(!passwordVisible)}
                            >
                              {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          <Button size="sm">
                            <Key className="h-4 w-4 mr-2" /> Update
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Password must be at least 8 characters with mixed case, numbers, and symbols</p>
                      </div>
                      <Separator />
                      
                      <div className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <Label className="font-medium">Encrypt Journal Entries</Label>
                          <p className="text-xs text-muted-foreground">Add extra protection to your personal journal entries</p>
                        </div>
                        <Switch 
                          checked={privacySettings.encryptJournals}
                          onCheckedChange={(checked) => handleSettingChange('encryptJournals', checked)}
                        />
                      </div>
                      <Separator />
                      
                      <div className="py-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="space-y-0.5">
                            <Label className="font-medium">Auto Logout When Inactive</Label>
                            <p className="text-xs text-muted-foreground">Automatically log out after period of inactivity</p>
                          </div>
                          <Switch 
                            checked={privacySettings.autoLogout}
                            onCheckedChange={(checked) => handleSettingChange('autoLogout', checked)}
                          />
                        </div>
                        {privacySettings.autoLogout && (
                          <div className="mt-2 bg-muted p-3 rounded-md">
                            <Label className="text-xs mb-2 block">Logout after inactive for:</Label>
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className={privacySettings.autoLogoutTime === 5 ? "bg-primary text-primary-foreground" : ""}
                                onClick={() => handleAutoLogoutTimeChange(5)}
                              >
                                5 mins
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className={privacySettings.autoLogoutTime === 15 ? "bg-primary text-primary-foreground" : ""}
                                onClick={() => handleAutoLogoutTimeChange(15)}
                              >
                                15 mins
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className={privacySettings.autoLogoutTime === 30 ? "bg-primary text-primary-foreground" : ""}
                                onClick={() => handleAutoLogoutTimeChange(30)}
                              >
                                30 mins
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className={privacySettings.autoLogoutTime === 60 ? "bg-primary text-primary-foreground" : ""}
                                onClick={() => handleAutoLogoutTimeChange(60)}
                              >
                                1 hour
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <Separator />
                      
                      <div className="py-2">
                        <Button className="w-full flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4" /> Reset Security Settings to Default
                        </Button>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="data" className="space-y-4">
                      <div className="mb-4 bg-muted p-4 rounded-md">
                        <div className="flex items-start mb-2">
                          <Info className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm">Your data is stored securely and you have control over how it's used. You can export or delete your data at any time.</p>
                        </div>
                      </div>
                      
                      <div className="py-2">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium mb-1">Data Storage</h3>
                            <p className="text-xs text-muted-foreground">Control where and how your data is stored</p>
                          </div>
                          <Badge variant="outline">Cloud Storage</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="border rounded-md p-4 flex flex-col">
                            <div className="flex items-center mb-2">
                              <Cloud className="h-4 w-4 mr-2 text-blue-500" />
                              <h4 className="font-medium">Cloud Storage</h4>
                            </div>
                            <p className="text-xs text-muted-foreground mb-4">Your data is securely stored in the cloud with encryption</p>
                            <div className="mt-auto">
                              <Badge variant="secondary" className="ml-auto">Current</Badge>
                            </div>
                          </div>
                          
                          <div className="border rounded-md p-4 flex flex-col bg-muted/50">
                            <div className="flex items-center mb-2">
                              <User className="h-4 w-4 mr-2 text-orange-500" />
                              <h4 className="font-medium">Local Storage Only</h4>
                            </div>
                            <p className="text-xs text-muted-foreground mb-4">Keep data only on your device, not synced to cloud</p>
                            <div className="mt-auto">
                              <Button variant="outline" size="sm" className="w-full">Switch to Local</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Separator />
                      
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="data-export">
                          <AccordionTrigger className="text-sm py-2">
                            <div className="flex items-center">
                              <Download className="h-4 w-4 mr-2" />
                              Data Export Options
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="px-4 pt-2 pb-4 space-y-3">
                              <p className="text-xs text-muted-foreground mb-2">Choose what data to export and in which format</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Button variant="outline" className="justify-start">
                                  <FileText className="h-4 w-4 mr-2" /> Export Journal Entries
                                </Button>
                                <Button variant="outline" className="justify-start">
                                  <User className="h-4 w-4 mr-2" /> Export Profile Data
                                </Button>
                                <Button variant="outline" className="justify-start">
                                  <MessageCircle className="h-4 w-4 mr-2" /> Export Chat History
                                </Button>
                                <Button variant="outline" className="justify-start">
                                  <Check className="h-4 w-4 mr-2" /> Export All Data
                                </Button>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="data-deletion">
                          <AccordionTrigger className="text-sm py-2">
                            <div className="flex items-center">
                              <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                              Data Deletion Options
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="px-4 pt-2 pb-4 space-y-3">
                              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-3">
                                <div className="flex items-start">
                                  <AlertCircle className="h-5 w-5 mr-2 text-destructive flex-shrink-0 mt-0.5" />
                                  <p className="text-xs">Warning: Data deletion is permanent and cannot be undone. Please proceed with caution.</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Button variant="outline" className="justify-start">
                                  <Clock className="h-4 w-4 mr-2" /> Delete Old Entries
                                </Button>
                                <Button variant="outline" className="justify-start">
                                  <MessageCircle className="h-4 w-4 mr-2" /> Delete Chat History
                                </Button>
                                <Button variant="outline" className="justify-start">
                                  <User className="h-4 w-4 mr-2" /> Delete Account Data
                                </Button>
                                <Button variant="destructive" className="justify-start">
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete Everything
                                </Button>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline">Cancel</Button>
                  <Button>
                    <Save className="h-4 w-4 mr-2" /> Save Settings
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SafetyPrivacy; 