import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  TextField,
  Typography,
  Tabs,
  Tab,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CloseIcon from '@mui/icons-material/Close';
import { requestOtp, verifyOtp, type OtpRequestResponse, type OtpVerifyResponse } from '@/api';

interface AuthPanelProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onOtpLogin?: (data: { accessToken: string; userId: string; phoneCountry: string; phoneNumber: string; upgradedChatSessionIds?: string[] }) => void;
  onCancel?: () => void;
}

type AuthMode = 'password' | 'otp';
type OtpStep = 'mobile' | 'otp';

const AuthPanel = ({ onLogin, onOtpLogin, onCancel }: AuthPanelProps) => {
  // Auth mode
  const [authMode, setAuthMode] = useState<AuthMode>('otp');
  
  // Password login state
  const [username, setUsername] = useState('testuser');
  const [password, setPassword] = useState('test123');
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP login state
  const [phoneCountry, setPhoneCountry] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequestId, setOtpRequestId] = useState<string | null>(null);
  const [otpStep, setOtpStep] = useState<OtpStep>('mobile');
  const [resendTimer, setResendTimer] = useState(0);
  
  // Common state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle password login
  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onLogin(username.trim(), password);
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP generation
  const handleGenerateOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await requestOtp(phoneCountry, phoneNumber);
      if (result.data?.otpRequestId) {
        setOtpRequestId(result.data.otpRequestId);
        setOtpStep('otp');
        setSuccess('OTP sent successfully! For testing, use 1234 or last 4 digits of phone number.');
        // Start resend timer based on API response
        const resendTime = result.data.resendAvailableInSec || 30;
        setResendTimer(resendTime);
        const interval = setInterval(() => {
          setResendTimer(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(result.error || 'Failed to send OTP');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP validation
  const handleValidateOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!otp || otp.length < 4) {
      setError('Please enter a valid OTP');
      return;
    }

    if (!otpRequestId) {
      setError('OTP request expired. Please request a new OTP.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await verifyOtp(otpRequestId, otp);
      // Token is now in HTTP-only cookie, check for user data instead
      if (result.data?.user?.userId) {
        // Call the OTP login callback if provided, otherwise use regular onLogin flow
        if (onOtpLogin) {
          onOtpLogin({
            accessToken: '', // Token is in HTTP-only cookie, not in response
            userId: result.data.user.userId,
            phoneCountry: result.data.user.phone.countryCode,
            phoneNumber: result.data.user.phone.number,
          });
        } else {
          // Fallback: create a mock user object for compatibility
          await onLogin(phoneNumber, otp);
        }
      } else {
        setError(result.error || 'Verification failed');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // Handle back to phone input
  const handleBackToMobile = () => {
    setOtpStep('mobile');
    setOtp('');
    setOtpRequestId(null);
    setError(null);
    setSuccess(null);
  };

  // Handle resend OTP
  const handleResendOtp = () => {
    if (resendTimer === 0) {
      handleGenerateOtp();
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'background.default', p: 2 }}>
      <Container maxWidth="sm" disableGutters>
        <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', position: 'relative' }}>
          {onCancel && (
            <IconButton
              onClick={onCancel}
              sx={{ position: 'absolute', top: 8, right: 8 }}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          )}
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Sign in to Commerce AI
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sign in to save your cart and access personalized features
            </Typography>

            {/* Auth Mode Tabs */}
            <Tabs
              value={authMode}
              onChange={(_, value) => {
                setAuthMode(value);
                setError(null);
                setSuccess(null);
              }}
              variant="fullWidth"
              sx={{ mb: 3 }}
            >
              <Tab 
                value="otp" 
                label="OTP Login" 
                icon={<PhoneIcon fontSize="small" />}
                iconPosition="start"
                sx={{ textTransform: 'none', fontWeight: 500 }}
              />
              <Tab 
                value="password" 
                label="Password" 
                icon={<PersonIcon fontSize="small" />}
                iconPosition="start"
                sx={{ textTransform: 'none', fontWeight: 500 }}
              />
            </Tabs>

            {/* Error/Success Messages */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                {success}
              </Alert>
            )}

            {/* OTP Login Form */}
            {authMode === 'otp' && (
              <Box component="form" onSubmit={otpStep === 'otp' ? handleValidateOtp : (e) => { e.preventDefault(); handleGenerateOtp(); }}>
                {otpStep === 'mobile' ? (
                  <>
                    <TextField
                      label="Phone Number"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter 10-digit phone number"
                      fullWidth
                      autoFocus
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <TextField
                              select
                              value={phoneCountry}
                              onChange={e => setPhoneCountry(e.target.value)}
                              variant="standard"
                              sx={{ width: 70, mr: 1 }}
                              SelectProps={{ native: true }}
                            >
                              <option value="+91">+91</option>
                              <option value="+1">+1</option>
                              <option value="+44">+44</option>
                              <option value="+61">+61</option>
                            </TextField>
                          </InputAdornment>
                        ),
                      }}
                      sx={{ mb: 2 }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={loading || phoneNumber.length < 10}
                      sx={{ py: 1.5 }}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Send OTP'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        OTP sent to {phoneCountry} {phoneNumber}
                      </Typography>
                      <Button size="small" onClick={handleBackToMobile} sx={{ ml: 'auto' }}>
                        Change
                      </Button>
                    </Box>
                    <TextField
                      label="Enter OTP"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 4-6 digit OTP"
                      fullWidth
                      autoFocus
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ mb: 2 }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={loading || otp.length < 4}
                      sx={{ py: 1.5, mb: 2 }}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Verify & Login'}
                    </Button>
                    <Box sx={{ textAlign: 'center' }}>
                      {resendTimer > 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          Resend OTP in {resendTimer}s
                        </Typography>
                      ) : (
                        <Button size="small" onClick={handleResendOtp} disabled={loading}>
                          Resend OTP
                        </Button>
                      )}
                    </Box>
                  </>
                )}

                <Divider sx={{ my: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Test Credentials
                  </Typography>
                </Divider>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Use any 10-digit phone number. OTP: <strong>1234</strong> or last 4 digits of phone number.
                </Typography>
              </Box>
            )}

            {/* Password Login Form */}
            {authMode === 'password' && (
              <Box component="form" onSubmit={handlePasswordSubmit}>
                <TextField
                  label="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  fullWidth
                  autoFocus
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{ py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Login'}
                </Button>

                <Divider sx={{ my: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Test Credentials
                  </Typography>
                </Divider>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Username: <strong>testuser</strong> / Password: <strong>test123</strong>
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default AuthPanel;
