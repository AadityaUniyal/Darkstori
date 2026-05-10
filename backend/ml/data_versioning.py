"""
Data Versioning and Lineage Tracking

Tracks dataset versions, calculates hashes for integrity verification,
and maintains data lineage for reproducibility.
"""

import logging
import hashlib
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import pandas as pd
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)


class DataVersionManager:
    """Manages data versioning and lineage tracking for ML datasets."""
    
    def __init__(self, artifact_path: str = "data_versions"):
        """
        Initialize data version manager.
        
        Args:
            artifact_path: Base path for storing data artifacts
        """
        self.artifact_path = Path(artifact_path)
        self.artifact_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"DataVersionManager initialized with path: {artifact_path}")
    
    def create_dataset_version(
        self,
        data: pd.DataFrame,
        version_name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a versioned dataset with unique identifier and hash.
        
        Args:
            data: Dataset to version
            version_name: Optional version name (auto-generated if not provided)
            metadata: Additional metadata to store
            
        Returns:
            Dictionary with version information
        """
        try:
            # Generate version identifier
            if version_name is None:
                version_name = self._generate_version_id()
            
            # Calculate dataset hash
            dataset_hash = self._calculate_dataset_hash(data)
            
            # Calculate dataset statistics
            stats = self._calculate_dataset_stats(data)
            
            # Detect schema
            schema = self._extract_schema(data)
            
            # Get date range
            date_range = self._get_date_range(data)
            
            # Create version info
            version_info = {
                'version_id': version_name,
                'dataset_hash': dataset_hash,
                'created_at': datetime.utcnow().isoformat(),
                'num_rows': len(data),
                'num_columns': len(data.columns),
                'columns': list(data.columns),
                'schema': schema,
                'statistics': stats,
                'date_range': date_range,
                'metadata': metadata or {}
            }
            
            # Save dataset artifact
            dataset_path = self.artifact_path / f"{version_name}_data.parquet"
            data.to_parquet(dataset_path, index=False)
            version_info['artifact_path'] = str(dataset_path)
            
            # Save version metadata
            metadata_path = self.artifact_path / f"{version_name}_metadata.json"
            with open(metadata_path, 'w') as f:
                json.dump(version_info, f, indent=2)
            
            logger.info(
                f"Created dataset version: {version_name} "
                f"({len(data)} rows, hash: {dataset_hash[:8]}...)"
            )
            
            return version_info
            
        except Exception as e:
            logger.error(f"Error creating dataset version: {e}")
            raise
    
    def load_dataset_version(self, version_id: str) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Load a versioned dataset.
        
        Args:
            version_id: Version identifier
            
        Returns:
            Tuple of (dataset, version_info)
        """
        try:
            # Load metadata
            metadata_path = self.artifact_path / f"{version_id}_metadata.json"
            with open(metadata_path, 'r') as f:
                version_info = json.load(f)
            
            # Load dataset
            dataset_path = self.artifact_path / f"{version_id}_data.parquet"
            data = pd.read_parquet(dataset_path)
            
            # Verify hash
            current_hash = self._calculate_dataset_hash(data)
            stored_hash = version_info['dataset_hash']
            
            if current_hash != stored_hash:
                logger.warning(
                    f"Dataset hash mismatch for version {version_id}: "
                    f"{current_hash[:8]}... != {stored_hash[:8]}..."
                )
            
            logger.info(f"Loaded dataset version: {version_id} ({len(data)} rows)")
            
            return data, version_info
            
        except Exception as e:
            logger.error(f"Error loading dataset version: {e}")
            raise
    
    def compare_versions(
        self,
        version_id_1: str,
        version_id_2: str
    ) -> Dict[str, Any]:
        """
        Compare two dataset versions.
        
        Args:
            version_id_1: First version ID
            version_id_2: Second version ID
            
        Returns:
            Dictionary with comparison results
        """
        try:
            # Load both versions
            _, info1 = self.load_dataset_version(version_id_1)
            _, info2 = self.load_dataset_version(version_id_2)
            
            comparison = {
                'version_1': version_id_1,
                'version_2': version_id_2,
                'identical': info1['dataset_hash'] == info2['dataset_hash'],
                'row_diff': info2['num_rows'] - info1['num_rows'],
                'column_diff': info2['num_columns'] - info1['num_columns'],
                'schema_changes': self._compare_schemas(info1['schema'], info2['schema']),
                'date_range_1': info1['date_range'],
                'date_range_2': info2['date_range']
            }
            
            logger.info(
                f"Compared versions {version_id_1} and {version_id_2}: "
                f"{'Identical' if comparison['identical'] else 'Different'}"
            )
            
            return comparison
            
        except Exception as e:
            logger.error(f"Error comparing versions: {e}")
            raise
    
    def track_data_lineage(
        self,
        version_id: str,
        sources: List[Dict[str, Any]],
        transformations: List[str],
        output_version_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Track data lineage from sources through transformations.
        
        Args:
            version_id: Output dataset version ID
            sources: List of source datasets with metadata
            transformations: List of transformation descriptions
            output_version_id: Optional output version ID
            
        Returns:
            Dictionary with lineage information
        """
        try:
            lineage = {
                'output_version': version_id,
                'created_at': datetime.utcnow().isoformat(),
                'sources': sources,
                'transformations': transformations,
                'lineage_graph': self._build_lineage_graph(sources, transformations)
            }
            
            # Save lineage metadata
            lineage_path = self.artifact_path / f"{version_id}_lineage.json"
            with open(lineage_path, 'w') as f:
                json.dump(lineage, f, indent=2)
            
            logger.info(
                f"Tracked data lineage for {version_id}: "
                f"{len(sources)} sources, {len(transformations)} transformations"
            )
            
            return lineage
            
        except Exception as e:
            logger.error(f"Error tracking data lineage: {e}")
            raise
    
    def detect_schema_changes(
        self,
        current_schema: Dict[str, str],
        previous_schema: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Detect schema changes between versions.
        
        Args:
            current_schema: Current dataset schema
            previous_schema: Previous dataset schema
            
        Returns:
            Dictionary with detected changes
        """
        try:
            changes = {
                'added_columns': [],
                'removed_columns': [],
                'type_changes': [],
                'has_changes': False
            }
            
            current_cols = set(current_schema.keys())
            previous_cols = set(previous_schema.keys())
            
            # Detect added columns
            added = current_cols - previous_cols
            if added:
                changes['added_columns'] = list(added)
                changes['has_changes'] = True
            
            # Detect removed columns
            removed = previous_cols - current_cols
            if removed:
                changes['removed_columns'] = list(removed)
                changes['has_changes'] = True
            
            # Detect type changes
            common_cols = current_cols & previous_cols
            for col in common_cols:
                if current_schema[col] != previous_schema[col]:
                    changes['type_changes'].append({
                        'column': col,
                        'old_type': previous_schema[col],
                        'new_type': current_schema[col]
                    })
                    changes['has_changes'] = True
            
            if changes['has_changes']:
                logger.warning(f"Schema changes detected: {changes}")
            else:
                logger.info("No schema changes detected")
            
            return changes
            
        except Exception as e:
            logger.error(f"Error detecting schema changes: {e}")
            raise
    
    def _generate_version_id(self) -> str:
        """Generate unique version identifier."""
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        return f"v_{timestamp}"
    
    def _calculate_dataset_hash(self, data: pd.DataFrame) -> str:
        """
        Calculate hash of dataset for integrity verification.
        
        Args:
            data: Dataset to hash
            
        Returns:
            SHA256 hash string
        """
        try:
            # Convert to bytes for hashing
            # Use sorted columns for consistency
            sorted_data = data.sort_index(axis=1)
            
            # Create hash from data values and column names
            hasher = hashlib.sha256()
            
            # Hash column names
            hasher.update(json.dumps(list(sorted_data.columns)).encode())
            
            # Hash data values (sample if too large)
            if len(sorted_data) > 10000:
                sample_data = sorted_data.sample(n=10000, random_state=42)
            else:
                sample_data = sorted_data
            
            # Convert to bytes and hash
            data_bytes = sample_data.to_csv(index=False).encode()
            hasher.update(data_bytes)
            
            return hasher.hexdigest()
            
        except Exception as e:
            logger.error(f"Error calculating dataset hash: {e}")
            return "error"
    
    def _calculate_dataset_stats(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Calculate dataset statistics."""
        try:
            stats = {
                'numeric_columns': {},
                'categorical_columns': {},
                'missing_values': {}
            }
            
            # Numeric column statistics
            numeric_cols = data.select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                stats['numeric_columns'][col] = {
                    'mean': float(data[col].mean()),
                    'std': float(data[col].std()),
                    'min': float(data[col].min()),
                    'max': float(data[col].max()),
                    'median': float(data[col].median()),
                    'q25': float(data[col].quantile(0.25)),
                    'q75': float(data[col].quantile(0.75))
                }
            
            # Categorical column statistics
            categorical_cols = data.select_dtypes(include=['object', 'category']).columns
            for col in categorical_cols:
                stats['categorical_columns'][col] = {
                    'unique_values': int(data[col].nunique()),
                    'top_values': data[col].value_counts().head(5).to_dict()
                }
            
            # Missing values
            missing = data.isnull().sum()
            stats['missing_values'] = {
                col: int(count) for col, count in missing.items() if count > 0
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error calculating dataset stats: {e}")
            return {}
    
    def _extract_schema(self, data: pd.DataFrame) -> Dict[str, str]:
        """Extract dataset schema."""
        return {col: str(dtype) for col, dtype in data.dtypes.items()}
    
    def _get_date_range(self, data: pd.DataFrame) -> Dict[str, Optional[str]]:
        """Get date range from dataset."""
        try:
            date_cols = data.select_dtypes(include=['datetime64']).columns
            
            if len(date_cols) == 0:
                # Try to find date columns
                for col in data.columns:
                    if 'date' in col.lower():
                        try:
                            data[col] = pd.to_datetime(data[col])
                            date_cols = [col]
                            break
                        except:
                            pass
            
            if len(date_cols) > 0:
                date_col = date_cols[0]
                return {
                    'start_date': str(data[date_col].min()),
                    'end_date': str(data[date_col].max()),
                    'date_column': date_col
                }
            
            return {'start_date': None, 'end_date': None, 'date_column': None}
            
        except Exception as e:
            logger.error(f"Error getting date range: {e}")
            return {'start_date': None, 'end_date': None, 'date_column': None}
    
    def _compare_schemas(
        self,
        schema1: Dict[str, str],
        schema2: Dict[str, str]
    ) -> Dict[str, Any]:
        """Compare two schemas."""
        return self.detect_schema_changes(schema2, schema1)
    
    def _build_lineage_graph(
        self,
        sources: List[Dict[str, Any]],
        transformations: List[str]
    ) -> Dict[str, Any]:
        """Build lineage graph structure."""
        return {
            'nodes': [
                {'id': f"source_{i}", 'type': 'source', 'data': source}
                for i, source in enumerate(sources)
            ] + [
                {'id': f"transform_{i}", 'type': 'transformation', 'data': transform}
                for i, transform in enumerate(transformations)
            ],
            'edges': [
                {'from': f"source_{i}", 'to': 'transform_0'}
                for i in range(len(sources))
            ] + [
                {'from': f"transform_{i}", 'to': f"transform_{i+1}"}
                for i in range(len(transformations) - 1)
            ]
        }


def log_dataset_version_to_mlflow(
    data: pd.DataFrame,
    version_manager: DataVersionManager,
    mlflow_client: Any,
    run_id: str,
    dataset_name: str = "training_data",
    metadata: Optional[Dict[str, Any]] = None
) -> str:
    """
    Create dataset version and log to MLflow.
    
    Args:
        data: Dataset to version
        version_manager: DataVersionManager instance
        mlflow_client: MLflow client
        run_id: MLflow run ID
        dataset_name: Name for the dataset
        metadata: Additional metadata
        
    Returns:
        Version ID
    """
    try:
        # Create version
        version_info = version_manager.create_dataset_version(
            data=data,
            version_name=f"{dataset_name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            metadata=metadata
        )
        
        # Log to MLflow
        mlflow_client.log_param(run_id, f"{dataset_name}_version", version_info['version_id'])
        mlflow_client.log_param(run_id, f"{dataset_name}_hash", version_info['dataset_hash'])
        mlflow_client.log_param(run_id, f"{dataset_name}_rows", version_info['num_rows'])
        mlflow_client.log_param(run_id, f"{dataset_name}_columns", version_info['num_columns'])
        
        # Log dataset artifact
        mlflow_client.log_artifact(run_id, version_info['artifact_path'])
        
        # Log metadata
        metadata_path = str(Path(version_info['artifact_path']).parent / f"{version_info['version_id']}_metadata.json")
        mlflow_client.log_artifact(run_id, metadata_path)
        
        logger.info(f"Logged dataset version to MLflow: {version_info['version_id']}")
        
        return version_info['version_id']
        
    except Exception as e:
        logger.error(f"Error logging dataset version to MLflow: {e}")
        raise
