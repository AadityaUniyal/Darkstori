import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, AlertTriangle } from "lucide-react";
import "./NotFound.css";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <span className="text-[30vw] font-bold">404</span>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 text-center max-w-md w-full bg-card/30 backdrop-blur-md border border-border p-10 rounded-2xl shadow-2xl"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="mb-8 flex justify-center"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
            <AlertTriangle size={80} className="text-primary relative z-10" />
          </div>
        </motion.div>
        
        <h1 className="text-5xl font-black text-foreground mb-4 tracking-tight">404</h1>
        <h2 className="text-xl font-semibold text-foreground/80 mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The quadrant you're looking for has been reassigned or doesn't exist in our current spatial index.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 w-full sm:w-auto"
        >
          <Home size={18} />
          <span>Return to Dashboard</span>
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
