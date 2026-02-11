import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import HomeIcon from '@mui/icons-material/Home';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StarIcon from '@mui/icons-material/Star';
import WorkIcon from '@mui/icons-material/Work';
import {
  getAllAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  type AddressEntry,
  type AddressFields,
  type AddressType,
} from '@/api';

interface AddressPanelProps {
  open: boolean;
  onClose: () => void;
  anchor?: 'right' | 'bottom';
}

const emptyAddress: AddressFields = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
};

const addressTypeLabels: Record<AddressType, string> = {
  home: 'Home',
  work: 'Work',
  other: 'Other',
};

const AddressTypeIcon = ({ type }: { type: AddressType }) => {
  switch (type) {
    case 'home':
      return <HomeIcon fontSize="small" />;
    case 'work':
      return <WorkIcon fontSize="small" />;
    default:
      return <LocationOnIcon fontSize="small" />;
  }
};

const AddressPanel = ({ open, onClose, anchor = 'right' }: AddressPanelProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Address list
  const [addresses, setAddresses] = useState<AddressEntry[]>([]);
  
  // Edit/Add dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressEntry | null>(null);
  const [formData, setFormData] = useState<AddressFields>(emptyAddress);
  const [addressType, setAddressType] = useState<AddressType>('home');
  const [addressLabel, setAddressLabel] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<AddressEntry | null>(null);

  // Fetch addresses on open
  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllAddresses();
      setAddresses(data);
    } catch {
      setError('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchAddresses();
    }
  }, [open, fetchAddresses]);

  // Open dialog for adding new address
  const handleAddClick = () => {
    setEditingAddress(null);
    setFormData(emptyAddress);
    setAddressType('home');
    setAddressLabel('');
    setIsDefault(addresses.length === 0); // First address is default
    setDialogOpen(true);
  };

  // Open dialog for editing address
  const handleEditClick = (address: AddressEntry) => {
    setEditingAddress(address);
    setFormData(address.address);
    setAddressType(address.type);
    setAddressLabel(address.label || '');
    setIsDefault(address.isDefault);
    setDialogOpen(true);
  };

  // Handle form field change
  const handleFieldChange = (field: keyof AddressFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  // Save address (add or update)
  const handleSave = async () => {
    // Validate required fields
    if (!formData.fullName || !formData.line1 || !formData.city || !formData.state || !formData.postalCode) {
      setError('Please fill all required fields');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingAddress) {
        // Update existing address
        await updateAddress(editingAddress.addressId, {
          type: addressType,
          label: addressLabel || undefined,
          isDefault,
          address: formData,
        });
        setSuccess('Address updated successfully!');
      } else {
        // Add new address
        await addAddress(addressType, formData, addressLabel || undefined, isDefault);
        setSuccess('Address added successfully!');
      }
      setDialogOpen(false);
      await fetchAddresses();
    } catch {
      setError('Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  // Delete address
  const handleDeleteClick = (address: AddressEntry) => {
    setAddressToDelete(address);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!addressToDelete) return;

    try {
      await deleteAddress(addressToDelete.addressId);
      setSuccess('Address deleted successfully!');
      setDeleteConfirmOpen(false);
      setAddressToDelete(null);
      await fetchAddresses();
    } catch {
      setError('Failed to delete address');
    }
  };

  // Set as default
  const handleSetDefault = async (address: AddressEntry) => {
    if (address.isDefault) return;

    try {
      await setDefaultAddress(address.addressId);
      setSuccess('Default address updated!');
      await fetchAddresses();
    } catch {
      setError('Failed to set default address');
    }
  };

  // Render address card
  const renderAddressCard = (address: AddressEntry) => (
    <Box
      key={address.addressId}
      sx={{
        p: 2,
        bgcolor: address.isDefault ? 'primary.50' : 'background.default',
        borderRadius: 2,
        border: address.isDefault ? '2px solid' : '1px solid',
        borderColor: address.isDefault ? 'primary.main' : 'divider',
        position: 'relative',
      }}
    >
      {/* Header with type and actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={<AddressTypeIcon type={address.type} />}
            label={address.label || addressTypeLabels[address.type]}
            size="small"
            color={address.isDefault ? 'primary' : 'default'}
          />
          {address.isDefault && (
            <Chip
              icon={<StarIcon fontSize="small" />}
              label="Default"
              size="small"
              color="success"
              variant="outlined"
            />
          )}
        </Box>
        <Box>
          <IconButton size="small" onClick={() => handleEditClick(address)} title="Edit">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => handleDeleteClick(address)} 
            title="Delete"
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Address details */}
      <Typography variant="body2" fontWeight={500}>{address.address.fullName}</Typography>
      {address.address.phone && (
        <Typography variant="body2" color="text.secondary">{address.address.phone}</Typography>
      )}
      <Typography variant="body2">{address.address.line1}</Typography>
      {address.address.line2 && <Typography variant="body2">{address.address.line2}</Typography>}
      <Typography variant="body2">
        {address.address.city}, {address.address.state} {address.address.postalCode}
      </Typography>
      <Typography variant="body2">{address.address.country || 'India'}</Typography>

      {/* Set as default button */}
      {!address.isDefault && (
        <Button
          size="small"
          variant="text"
          onClick={() => handleSetDefault(address)}
          sx={{ mt: 1, p: 0 }}
        >
          Set as Default
        </Button>
      )}
    </Box>
  );

  return (
    <>
      <Drawer
        anchor={anchor}
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: anchor === 'right' ? 420 : '100%',
            maxHeight: anchor === 'bottom' ? '80vh' : '100%',
            borderTopLeftRadius: anchor === 'bottom' ? 16 : 0,
            borderTopRightRadius: anchor === 'bottom' ? 16 : 0,
          },
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOnIcon color="primary" />
            <Typography variant="h6">My Addresses</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto' }}>
          {/* Messages */}
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

          {/* Add Address Button */}
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            fullWidth
            onClick={handleAddClick}
            sx={{ mb: 2, borderRadius: 2 }}
          >
            Add New Address
          </Button>

          <Divider sx={{ mb: 2 }} />

          {/* Loading */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : addresses.length === 0 ? (
            /* No Addresses */
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <LocationOnIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No addresses saved yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add your first address to get started
              </Typography>
            </Box>
          ) : (
            /* Address List */
            <Stack spacing={2}>
              {addresses.map(renderAddressCard)}
            </Stack>
          )}
        </Box>
      </Drawer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingAddress ? 'Edit Address' : 'Add New Address'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* Address Type */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={addressType}
                  label="Type"
                  onChange={(e) => setAddressType(e.target.value as AddressType)}
                >
                  <MenuItem value="home">Home</MenuItem>
                  <MenuItem value="work">Work</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Label (optional)"
                value={addressLabel}
                onChange={(e) => setAddressLabel(e.target.value)}
                size="small"
                fullWidth
                placeholder="e.g., Mom's House"
              />
            </Box>

            <Divider />

            {/* Address Fields */}
            <TextField
              label="Full Name *"
              value={formData.fullName}
              onChange={handleFieldChange('fullName')}
              size="small"
              fullWidth
            />
            <TextField
              label="Phone Number"
              value={formData.phone || ''}
              onChange={handleFieldChange('phone')}
              size="small"
              fullWidth
            />
            <TextField
              label="Address Line 1 *"
              value={formData.line1}
              onChange={handleFieldChange('line1')}
              size="small"
              fullWidth
              placeholder="House/Flat No., Building Name"
            />
            <TextField
              label="Address Line 2"
              value={formData.line2 || ''}
              onChange={handleFieldChange('line2')}
              size="small"
              fullWidth
              placeholder="Street, Area, Landmark"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="City *"
                value={formData.city}
                onChange={handleFieldChange('city')}
                size="small"
                fullWidth
              />
              <TextField
                label="State *"
                value={formData.state}
                onChange={handleFieldChange('state')}
                size="small"
                fullWidth
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Postal Code *"
                value={formData.postalCode}
                onChange={handleFieldChange('postalCode')}
                size="small"
                fullWidth
              />
              <TextField
                label="Country"
                value={formData.country || 'India'}
                onChange={handleFieldChange('country')}
                size="small"
                fullWidth
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : editingAddress ? 'Update' : 'Add Address'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Address?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this address? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddressPanel;
