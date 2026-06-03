"""
Transform k n-dimensional vectors to k 2D vectors using:
1. Neighborhood-based projection: t-SNE and UMAP
2. Linear projection: PCA
"""

import argparse
import csv
import numpy as np
from sklearn.manifold import TSNE
from sklearn.decomposition import PCA

try:
    import umap
    UMAP_AVAILABLE = True
except ImportError:
    UMAP_AVAILABLE = False


def reduce_tsne(vectors: np.ndarray, perplexity: int = 30, random_state: int = 42) -> np.ndarray:
    perplexity = min(perplexity, len(vectors) - 1)
    return TSNE(n_components=2, perplexity=perplexity, random_state=random_state).fit_transform(vectors)


def reduce_umap(vectors: np.ndarray, n_neighbors: int = 15, random_state: int = 42) -> np.ndarray:
    if not UMAP_AVAILABLE:
        raise ImportError("umap-learn is not installed. Run: pip install umap-learn")
    n_neighbors = min(n_neighbors, len(vectors) - 1)
    return umap.UMAP(n_components=2, n_neighbors=n_neighbors, random_state=random_state).fit_transform(vectors)


def reduce_pca(vectors: np.ndarray) -> np.ndarray:
    return PCA(n_components=2).fit_transform(vectors)


METHODS = {
    "1": ("t-SNE (neighborhood-based)", reduce_tsne),
    "2": ("UMAP (neighborhood-based)", reduce_umap),
    "3": ("PCA (linear projection)", reduce_pca),
}


def load_vectors_from_csv(filepath: str):
    """Load k n-dimensional vectors from a CSV file. First column is label_name, rest are numeric."""
    labels = []
    rows = []
    with open(filepath, "r") as f:
        reader = csv.reader(f)
        header = next(reader, None)  # skip header
        for row in reader:
            labels.append(row[0])
            rows.append([float(v) for v in row[1:]])
    return labels, np.array(rows)


def main():
    parser = argparse.ArgumentParser(description="Reduce n-dimensional vectors to 2D.")
    parser.add_argument("--method", choices=["tsne", "umap", "pca"],
                        help="Reduction method: tsne, umap, or pca")
    parser.add_argument("--csv", type=str, default=None,
                        help="Path to CSV file with vectors (each row = one vector)")
    parser.add_argument("--output", type=str, default=None,
                        help="Path to save the 2D output as CSV")
    args = parser.parse_args()

    # --- Load vectors ---
    labels = None
    if args.csv:
        labels, vectors = load_vectors_from_csv(args.csv)
        print(f"Loaded {vectors.shape[0]} vectors of {vectors.shape[1]} dimensions from {args.csv}")
    else:
        np.random.seed(0)
        k, n = 50, 10
        vectors = np.random.randn(k, n)
        labels = [f"item_{i}" for i in range(k)]
        print(f"Using demo data: {k} vectors of {n} dimensions")

    # --- Select method ---
    method_key = None
    if args.method:
        mapping = {"tsne": "1", "umap": "2", "pca": "3"}
        method_key = mapping[args.method]
    else:
        print("\nChoose a dimensionality reduction method:")
        for key, (name, _) in METHODS.items():
            print(f"  {key}. {name}")
        method_key = input("\nEnter choice (1/2/3): ").strip()

    if method_key not in METHODS:
        print("Invalid choice.")
        return

    name, func = METHODS[method_key]
    print(f"\nRunning {name}...")
    result = func(vectors)
    print(f"Output shape: {result.shape}")
    print("First 5 projected 2D points:")
    for i in range(min(5, len(result))):
        print(f"  {labels[i]}: ({result[i][0]:.6f}, {result[i][1]:.6f})")

    # --- Save output ---
    if args.output:
        with open(args.output, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["label_name", "x", "y"])
            for label, (x, y) in zip(labels, result):
                writer.writerow([label, x, y])
        print(f"\nSaved 2D output to {args.output}")


if __name__ == "__main__":
    main()
