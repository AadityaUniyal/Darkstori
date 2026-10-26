import DecisionQueue from './DecisionQueue';

// Keep the existing component entry point stable while routing every caller to
// the live, operator-approved workflow. The old component simulated execution.
export default function AutonomousActionHub({ selectedCity = 'Bangalore' }) {
  return <DecisionQueue city={selectedCity} />;
}
