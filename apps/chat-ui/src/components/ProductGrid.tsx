import { Box, Typography } from '@mui/material';
import { ProductSummary } from '@/types';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: ProductSummary[];
  onAddToCart: (productId: string, provider: string) => void;
}

const ProductGrid = ({ products, onAddToCart }: ProductGridProps) => {
  if (!products.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No products found.
      </Typography>
    );
  }
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
        },
      }}
    >
      {products.map(product => (
        <ProductCard key={`${product.provider}-${product.id}`} product={product} onAddToCart={onAddToCart} />
      ))}
    </Box>
  );
};

export default ProductGrid;
