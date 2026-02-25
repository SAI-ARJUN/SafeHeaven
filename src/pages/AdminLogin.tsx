import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Wallet, AlertCircle, CheckCircle, Link, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import MetaMaskGuide from '@/components/MetaMaskGuide';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isMetaMaskInstalled, connectWallet, isConnected, walletAddress, isConnecting } = useWallet();
  const { verifyAdminOnChain, isVerifyingAdmin, isAdmin } = useAuth();

  // INSTANT REDIRECT: Check localStorage immediately on mount
  useEffect(() => {
    const savedAdmin = localStorage.getItem('isAdmin');
    const savedWallet = localStorage.getItem('adminWalletAddress');
    
    if (savedAdmin === 'true' && savedWallet) {
      // Already verified - redirect instantly without any checks
      navigate('/admin');
      return;
    }
  }, [navigate]);

  // Auto-verify only if wallet connected and not already verified
  useEffect(() => {
    const savedAdmin = localStorage.getItem('isAdmin');
    if (savedAdmin === 'true') return; // Skip if already verified
    
    if (isConnected && walletAddress && !isVerifyingAdmin) {
      handleVerifyAdmin();
    }
  }, [isConnected, walletAddress, isVerifyingAdmin]);

  useEffect(() => {
    if (isAdmin) {
      navigate('/admin');
    }
  }, [isAdmin, navigate]);

  const handleVerifyAdmin = async () => {
    if (!walletAddress) return;

    // INSTANT: Check hardcoded admin wallet (no blockchain needed)
    const isHardcodedAdmin = walletAddress.toLowerCase() === '0x548cb269df02005590cf48fb031dd697e52aa201'.toLowerCase();
    
    if (isHardcodedAdmin) {
      // Set localStorage and redirect instantly
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('adminWalletAddress', walletAddress);
      toast({
        title: 'Admin Verified',
        description: 'Welcome, Admin. Redirecting to dashboard...',
      });
      navigate('/admin');
      return;
    }

    // Fallback: Try blockchain verification (only for non-hardcoded wallets)
    const isAdminVerified = await verifyAdminOnChain(walletAddress);

    if (isAdminVerified) {
      toast({
        title: 'Admin Verified on Blockchain',
        description: 'Welcome, Admin. Redirecting to dashboard...',
      });
    } else {
      toast({
        title: 'Access Denied',
        description: 'This wallet is not registered as admin on the smart contract.',
        variant: 'destructive',
      });
    }
  };

  const handleConnect = async () => {
    try {
      await connectWallet();
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: 'Failed to connect MetaMask. Please try again.',
        variant: 'destructive',
      });
    }
  };

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
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-md">
        <div className="glass-card rounded-2xl p-8 text-center">
          {/* Header */}
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">
            Admin <span className="gradient-text">Portal</span>
          </h2>
          <p className="text-muted-foreground mb-8">
            Connect your authorized admin wallet to access the dashboard
          </p>

          {/* Connection Status */}
          {isConnected ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted border border-border">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="text-sm font-medium">Wallet Connected</span>
                </div>
                <p className="font-mono text-sm text-muted-foreground">
                  {walletAddress?.slice(0, 10)}...{walletAddress?.slice(-8)}
                </p>
              </div>

              {isVerifyingAdmin && (
                <div className="flex items-center justify-center gap-2 text-primary">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Verifying on blockchain...</span>
                </div>
              )}

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Link className="w-4 h-4" />
                  <span>Verification uses smart contract's isAdmin function</span>
                </div>
              </div>

              <Button
                className="btn-gradient w-full py-4 rounded-xl"
                onClick={handleVerifyAdmin}
                disabled={isVerifyingAdmin}
              >
                {isVerifyingAdmin ? 'Verifying on Chain...' : 'Verify Admin Access'}
              </Button>
            </div>
          ) : (
            <Button
              className="btn-gradient w-full py-4 rounded-xl"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              <Wallet className="w-5 h-5 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect Admin Wallet'}
            </Button>
          )}

          {/* Info */}
          <div className="mt-8 p-4 rounded-xl bg-warning/10 border border-warning/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-medium text-warning">Admin Access Only</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Only pre-authorized wallet addresses can access the admin dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
