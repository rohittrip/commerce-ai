import { Box, Button, CircularProgress, Divider, Typography } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import type { ProductSummary, Order } from '@/types';
import MessageBubble from './MessageBubble';
import ProductGrid from './ProductGrid';
import ComparisonTable from './ComparisonTable';
import OrderCard from './OrderCard';

type ChatItem =
  | {
      id: string;
      kind: 'message';
      role: 'user' | 'assistant';
      content: string;
      createdAt?: string;
      streaming?: boolean;
    }
  | { id: string; kind: 'cards'; products: ProductSummary[] }
  | { id: string; kind: 'comparison'; products: ProductSummary[]; matrix?: Record<string, string[]> }
  | { id: string; kind: 'order'; order: Order }
  | { id: string; kind: 'followups'; suggestions: string[] };

interface MessageListProps {
  items: ChatItem[];
  onAddToCart: (productId: string, provider: string) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

const MessageList = ({ items, onAddToCart, hasMore, loadingMore, onLoadMore }: MessageListProps) => {
  if (!items.length) {
    return (
      <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 6 }}>
        <Typography variant="h6" gutterBottom>
          Start a conversation
        </Typography>
        <Typography variant="body2">
          Ask for products, compare options, or create an order with the assistant.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {/* Load More Button at the top */}
      {hasMore && onLoadMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <Button
            variant="text"
            size="small"
            onClick={onLoadMore}
            disabled={loadingMore}
            startIcon={loadingMore ? <CircularProgress size={16} /> : <KeyboardArrowUpIcon />}
          >
            {loadingMore ? 'Loading...' : 'Load older messages'}
          </Button>
        </Box>
      )}
      {items.map(item => {
        switch (item.kind) {
          case 'message':
            return <MessageBubble key={item.id} role={item.role} content={item.content} createdAt={item.createdAt} />;
          case 'cards':
            return (
              <Box key={item.id} sx={{ display: 'grid', gap: 1 }}>
                <Typography variant="subtitle1">Recommended products</Typography>
                <ProductGrid products={item.products} onAddToCart={onAddToCart} />
              </Box>
            );
          case 'comparison':
            return (
              <Box key={item.id} sx={{ display: 'grid', gap: 1 }}>
                <Typography variant="subtitle1">Comparison</Typography>
                <ComparisonTable products={item.products} matrix={item.matrix} />
              </Box>
            );
          case 'order':
            return <OrderCard key={item.id} order={item.order} />;
          case 'followups':
            return (
              <Box key={item.id} sx={{ display: 'grid', gap: 1 }}>
                <Divider />
                <Typography variant="body2" color="text.secondary">
                  Suggestions are ready below.
                </Typography>
              </Box>
            );
          default:
            return null;
        }
      })}
    </Box>
  );
};

export default MessageList;
