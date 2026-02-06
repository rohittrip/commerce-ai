import { Box, Chip, Paper, Typography } from '@mui/material';
import { Order } from '@/types';
import { formatMoney } from '@/utils/format';

interface OrderCardProps {
  order: Order;
}

const OrderCard = ({ order }: OrderCardProps) => {
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1">Order created</Typography>
        <Chip label={order.status} color="primary" size="small" />
      </Box>
      <Typography variant="body2" color="text.secondary">
        Order ID: {order.id}
      </Typography>
      <Typography variant="body1" sx={{ mt: 1 }}>
        Total: {formatMoney(order.total)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Payment: {order.paymentMethod}
      </Typography>
    </Paper>
  );
};

export default OrderCard;
