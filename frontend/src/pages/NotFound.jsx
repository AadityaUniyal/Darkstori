import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "./NotFound.css";

const NotFound = () => {
  return (
    <div className="not-found-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <h1 
          className="not-found-title" 
          style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: '6rem', 
            fontWeight: 700, 
            color: 'var(--saffron-500)',
            margin: 0
          }}
        >
          404
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-5)' }}>
          This page doesn&apos;t exist.
        </p>
        <Link to="/" className="btn-primary" style={{ textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
