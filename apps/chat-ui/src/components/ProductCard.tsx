import { Box, Button, Card, CardActions, CardContent, CardMedia, Chip, Typography } from '@mui/material';
import { ProductSummary } from '@/types';
import { formatMoney } from '@/utils/format';

interface ProductCardProps {
  product: ProductSummary;
  onAddToCart: (productId: string, provider: string) => void;
}

const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const availabilityLabel = product.availability?.status?.replace('_', ' ') || 'IN STOCK';
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      {product.imageUrl ? (
        <CardMedia component="img" height="160" image={product.imageUrl} alt={product.name} />
      ) : (
        <Box sx={{ height: 160, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            No image
          </Typography>
        </Box>
      )}
      <CardContent sx={{ display: 'grid', gap: 1 }}>
        <Typography variant="subtitle1">{product.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {product.brand || product.category || 'Catalog'}
        </Typography>
        <Typography variant="h6">{formatMoney(product.price)}</Typography>
        <Chip label={availabilityLabel} size="small" color={product.availability?.inStock ? 'success' : 'default'} />
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button variant="contained" fullWidth onClick={() => onAddToCart(product.id, product.provider)}>
          Add to cart
        </Button>
      </CardActions>
    </Card>
  );
};

export default ProductCard;
