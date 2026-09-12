import ErrorBoundary from './ErrorBoundary';
import FitseamV2 from './fitseam-v2';

export default function App() {
  return (
    <ErrorBoundary>
      <FitseamV2 />
    </ErrorBoundary>
  );
}
