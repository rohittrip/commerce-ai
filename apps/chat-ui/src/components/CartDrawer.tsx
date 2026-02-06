import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Cart } from '@/types';
import { formatMoney } from '@/utils/format';

interface CartDrawerProps {
  cart: Cart | null;
  open: boolean;
  onClose: () => void;
  onUpdateItem: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  anchor: 'right' | 'bottom';
}

const CartDrawer = ({ cart, open, onClose, onUpdateItem, onRemoveItem, anchor }: CartDrawerProps) => {
  const items = cart?.items ?? [];

  return (
    <Drawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: anchor === 'right' ? 360 : '100%',
          borderTopLeftRadius: anchor === 'bottom' ? 16 : 0,
          borderTopRightRadius: anchor === 'bottom' ? 16 : 0,
          p: 2,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Cart</Typography>
        <Typography variant="body2" color="text.secondary">
          {cart?.itemCount || 0} items
        </Typography>
      </Box>

      {items.length ? (
        <Stack spacing={2} sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {items.map(item => (
            <Box key={`${item.provider}-${item.productId}`} sx={{ display: 'grid', gap: 1 }}>
              <Typography variant="subtitle2">{item.product?.name || item.productId}</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatMoney(item.unitPrice)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => onUpdateItem(item.productId, Math.max(1, item.quantity - 1))}
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
                <Typography variant="body2">{item.quantity}</Typography>
                <IconButton size="small" onClick={() => onUpdateItem(item.productId, item.quantity + 1)}>
                  <AddIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => onRemoveItem(item.productId)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
              <Divider />
            </Box>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Your cart is empty.
        </Typography>
      )}

      <Box sx={{ mt: 3, display: 'grid', gap: 1 }}>
        <Divider />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            Subtotal
          </Typography>
          <Typography variant="body2">{formatMoney(cart?.subtotal)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            Tax
          </Typography>
          <Typography variant="body2">{formatMoney(cart?.tax)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1">Total</Typography>
          <Typography variant="subtitle1">{formatMoney(cart?.total)}</Typography>
        </Box>
        <Button variant="contained" size="large" disabled={!items.length}>
          Checkout
        </Button>
      </Box>
    </Drawer>
  );
};

export default CartDrawer;
