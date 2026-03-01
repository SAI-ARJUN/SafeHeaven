import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Wallet, User, Mail, Phone, Calendar, Lock, CheckCircle, Copy, ArrowRight, Loader2, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/contexts/WalletContext';
import { useAuth } from '@/contexts/AuthContext';
import MetaMaskGuide from '@/components/MetaMaskGuide';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isMetaMaskInstalled, connectWallet, isConnected, walletAddress, isConnecting } = useWallet();
  const { register } = useAuth();

  const [step, setStep] = useState<'connect' | 'form' | 'success'>('connect');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    dob: '',
    password: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConnect = async () => {
    try {
      await connectWallet();
      setStep('form');
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: 'Failed to connect MetaMask. Please try again.',
        variant: 'destructive',
      });
    }
  };

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
      // Register user
      const success = await register(
        {
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          dob: formData.dob,
          walletAddress: walletAddress!,
        },
        formData.password
      );

      if (!success) {
        toast({
          title: 'Registration Failed',
          description: 'Username already taken. Please try another.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      setStep('success');
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formData.username);
    toast({
      title: 'Copied!',
      description: 'Username copied to clipboard.',
    });
  };

  // Show MetaMask guide if not installed
  if (!isMetaMaskInstalled) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <MetaMaskGuide />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-lg">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {['Connect', 'Register', 'Complete'].map((label, index) => (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${(step === 'connect' && index === 0) ||
                      (step === 'form' && index === 1) ||
                      (step === 'success' && index === 2)
                      ? 'bg-primary text-primary-foreground'
                      : index < (['connect', 'form', 'success'].indexOf(step))
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                >
                  {index + 1}
                </div>
                <span className="text-xs mt-2 text-muted-foreground">{label}</span>
              </div>
              {index < 2 && (
                <div className={`w-16 h-0.5 ${index < ['connect', 'form', 'success'].indexOf(step)
                    ? 'bg-primary'
                    : 'bg-muted'
                  }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step: Connect Wallet */}
        {step === 'connect' && (
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-4">
              Connect Your <span className="gradient-text">Wallet</span>
            </h2>
            <p className="text-muted-foreground mb-8">
              Connect your MetaMask wallet to create a blockchain-verified tourist identity.
            </p>
            <Button
              className="btn-gradient px-8 py-4 rounded-xl w-full"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              <Wallet className="w-5 h-5 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
            </Button>
          </div>
        )}

        {/* Step: Registration Form */}
        {step === 'form' && (
          <div className="glass-card rounded-2xl p-8">
            <h2 className="font-display text-2xl font-bold mb-2 text-center">
              Create Your <span className="gradient-text">Profile</span>
            </h2>
            <p className="text-muted-foreground text-center mb-6">
              Fill in your details to complete registration
            </p>

            {/* Connected Wallet */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/30 mb-6">
              <CheckCircle className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Connected Wallet</p>
                <p className="font-mono text-sm">{walletAddress?.slice(0, 10)}...{walletAddress?.slice(-8)}</p>
              </div>
            </div>

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
                  placeholder="Enter your username"
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
                    Create Account
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-3">
                <CheckCircle className="w-3 h-3 text-success" />
                <span>Free registration - No fees required</span>
              </div>
            </form>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-4">
              Registration <span className="gradient-text">Successful!</span>
            </h2>
            <p className="text-muted-foreground mb-6">
              Your account has been created successfully!
            </p>

            <div className="p-4 rounded-xl bg-muted border border-border mb-4">
              <p className="text-xs text-muted-foreground mb-2">Your Username</p>
              <div className="flex items-center justify-center gap-2">
                <p className="font-mono text-xl font-bold text-primary">{formData.username}</p>
                <button
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Copy className="w-5 h-5 text-primary" />
                </button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Use this username along with your password to log in.
            </p>

            <div className="flex flex-col gap-3">
              <Button
                className="btn-gradient py-4 rounded-xl"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Link to="/login">
                <Button variant="ghost" className="w-full">
                  Go to Login
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Login Link */}
        {step !== 'success' && (
          <p className="text-center mt-6 text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Login here
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default SignUp;
