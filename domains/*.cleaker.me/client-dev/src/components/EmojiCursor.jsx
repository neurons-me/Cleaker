import React, { useState } from 'react';
import { Box, Button } from '@mui/material';

const EmojiCursor = () => {
  const [selectedEmoji, setSelectedEmoji] = useState('😀');

  return (
    <Box
      sx={{
        height: '100vh', // Full viewport height for testing
        cursor: selectedEmoji
          ? `url("data:image/svg+xml,${encodeURIComponent(
              `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><text x='0' y='24' font-size='24'>${selectedEmoji}</text></svg>`
            )}"), auto`
          : 'auto',
      }}
    >
      <Button onClick={() => setSelectedEmoji('🔥')}>Set Cursor to 🔥</Button>
    </Box>
  );
};

export default EmojiCursor;