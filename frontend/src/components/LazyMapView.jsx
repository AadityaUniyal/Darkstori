import { lazy, Suspense } from 'react';
import RangoliLoader from './RangoliLoader';

const MapView = lazy(() => import('./MapView'));

export default function LazyMapView(props) {
  return (
    <Suspense fallback={<RangoliLoader />}>
      <MapView {...props} />
    </Suspense>
  );
}
