import { css } from '@emotion/react';

export const global = css`
  * {
    box-sizing: border-box;
  }
  html,
  body {
    padding: 0;
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial,
      Apple Color Emoji, Segoe UI Emoji;
    background: #0b1020;
    color: #e9eefc;
  }
  a {
    color: inherit;
    text-decoration: none;
  }
  button,
  input,
  textarea {
    font: inherit;
  }
`;

