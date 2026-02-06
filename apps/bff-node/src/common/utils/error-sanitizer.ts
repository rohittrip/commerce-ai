export function sanitizeError(error: any, debugMode: boolean, traceId?: string): string {
  if (debugMode) {
    // Return full error details in debug mode
    const message = error?.message || String(error);
    const trace = traceId ? ` [trace: ${traceId}]` : '';
    return `${message}${trace}`;
  }
  
  // Production: Return safe, user-friendly messages
  const message = error?.message || '';
  
  if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    return 'Request timed out. Please try again.';
  }
  
  if (message.includes('network') || message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
    return 'Unable to connect to the service. Please check your connection.';
  }
  
  if (message.includes('LLM') || message.includes('provider')) {
    return 'AI service temporarily unavailable. Please try again.';
  }
  
  // Generic fallback
  return 'An error occurred. Please try again or contact support.';
}
