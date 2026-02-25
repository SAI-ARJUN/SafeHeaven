import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Phone, Calendar, Lock, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    dob: '',
    password: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if username already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', formData.username)
        .maybeSingle();

      if (existingProfile) {
        toast({
          title: 'Username Taken',
          description: 'This username is already registered. Please choose another.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Save to Supabase
      const userId = crypto.randomUUID();
      const touristId = `TID-${formData.username.toUpperCase()}`;

      const { data: profileData, error: dbError } = await supabase.from('profiles').insert({
        id: userId,
        user_id: userId,
        tourist_id: touristId,
        username: formData.username,
        email: formData.email,
        phone: formData.phone || null,
        dob: formData.dob,
        status: 'safe',
      }).select().single();

      if (dbError) {
        console.error('❌ Database error:', dbError);
        toast({
          title: 'Registration Failed',
          description: dbError.message,
          variant: 'destructive',
        });
        return;
      }

      console.log('✅ Profile saved to Supabase:', profileData);

      toast({
        title: 'Registration Complete!',
        description: 'Your account has been created successfully!',
      });

      // Navigate to login
      navigate('/login');
    } catch (error: any) {
      console.error('❌ Registration error:', error);

      let errorMessage = 'Something went wrong. Please try again.';

      if (error?.message?.includes('duplicate')) {
        errorMessage = 'This username is already registered. Please choose another.';
      }

      toast({
        title: 'Registration Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-md">
        <div className="glass-card rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">
              Create Your <span className="gradient-text">Account</span>
            </h2>
            <p className="text-muted-foreground">
              Sign up with username and password
            </p>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username" className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-primary" />
                Username
              </Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Choose a unique username"
                required
                className="bg-muted/50 border-border"
              />
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-primary" />
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
                className="bg-muted/50 border-border"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-primary" />
                Phone Number
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter your phone number"
                required
                className="bg-muted/50 border-border"
              />
            </div>

            <div>
              <Label htmlFor="dob" className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-primary" />
                Date of Birth
              </Label>
              <Input
                id="dob"
                name="dob"
                type="date"
                value={formData.dob}
                onChange={handleInputChange}
                required
                className="bg-muted/50 border-border"
              />
            </div>

            <div>
              <Label htmlFor="password" className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-primary" />
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Create a password"
                required
                className="bg-muted/50 border-border"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-primary" />
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                required
                className="bg-muted/50 border-border"
              />
            </div>

            <Button
              type="submit"
              className="btn-gradient w-full py-4 rounded-xl mt-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Sign Up
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Login Link */}
          <p className="text-center mt-6 text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
