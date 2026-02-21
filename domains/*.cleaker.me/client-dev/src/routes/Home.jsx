import { Hero } from 'this.gui';
import { Link as RouterLink } from 'react-router-dom';

export default function Home() {
  return (
    <Hero
      backgroundSrc="https://res.cloudinary.com/dkwnxf6gm/image/upload/v1761149344/this.me_kx1ura.jpg"
      backgroundType="image"
      blur="light"
      customColor="rgba(13, 36, 52, 0.7)"
    >
      <div
        style={{
          fontSize: '2rem',
          fontWeight: 700,
          textAlign: 'center',
          marginTop: '1vh',
        }}
      >
        .Cleaker
        <div style={{ fontSize: '1rem', fontWeight: 500, opacity: 0.9, marginTop: 12 }}>
          {' '}
          <RouterLink
            to="/board"
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              textDecoration: 'underline',
              color: 'inherit',
            }}
          >
            /dashboard
          </RouterLink>{' '}
        </div>
      </div>
    </Hero>
  );
}