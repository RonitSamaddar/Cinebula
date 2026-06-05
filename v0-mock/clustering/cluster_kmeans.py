"""
Unsupervised pipeline (K-Means variant):
  1. Load 768-D embedding vectors from final.csv
  2. Reduce to 2-D with t-SNE (preserves local neighbourhood structure)
  3. Cluster the 2-D points with K-Means
  4. Use Elbow + Silhouette methods to pick optimal k
  5. Write output CSV: movie, x, y, cluster
"""

import numpy as np
import pandas as pd
from sklearn.manifold import TSNE
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
import matplotlib.pyplot as plt
import os

# ── 1. Load data ─────────────────────────────────────────────────────────────
INPUT = os.path.join(os.path.dirname(__file__), "final.csv")
OUTPUT_CSV = os.path.join(os.path.dirname(__file__), "output_2d_kmeans.csv")
OUTPUT_CLUSTERS = os.path.join(os.path.dirname(__file__), "clusters_kmeans.png")
OUTPUT_ELBOW = os.path.join(os.path.dirname(__file__), "elbow.png")

print("Loading embeddings …")

movies_list = []
vectors_list = []
with open(INPUT, "r") as f:
    header = f.readline()  # skip header
    for line in f:
        line = line.strip()
        if not line:
            continue
        parts = line.split(",")
        vec_parts = parts[-768:]
        name_parts = parts[:-768]
        movies_list.append(",".join(name_parts))
        vectors_list.append([float(v) for v in vec_parts])

movies = np.array(movies_list)
vectors = np.array(vectors_list, dtype=np.float32)

print(f"  → {len(movies)} movies, {vectors.shape[1]}-D vectors")

# ── 2. Dimensionality reduction: 768-D → 2-D via t-SNE ──────────────────────
print("Running t-SNE (768-D → 2-D) …")
tsne = TSNE(
    n_components=2,
    perplexity=30,
    learning_rate="auto",
    init="pca",
    random_state=42,
    max_iter=1000,
    metric="cosine",
)
coords_2d = tsne.fit_transform(vectors)

# Normalise to [0, 1000] range
x_min, x_max = coords_2d[:, 0].min(), coords_2d[:, 0].max()
y_min, y_max = coords_2d[:, 1].min(), coords_2d[:, 1].max()
coords_2d[:, 0] = (coords_2d[:, 0] - x_min) / (x_max - x_min) * 1000
coords_2d[:, 1] = (coords_2d[:, 1] - y_min) / (y_max - y_min) * 1000

# ── 3. Elbow + Silhouette analysis to find optimal k ────────────────────────
K_RANGE = range(131, 230)  # test k = 2 … 30

print("Running Elbow + Silhouette analysis …")
inertias = []
silhouettes = []

for k in K_RANGE:
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    km.fit(coords_2d)
    inertias.append(km.inertia_)
    sil = silhouette_score(coords_2d, km.labels_)
    silhouettes.append(sil)
    print(f"  k={k:>2d}  inertia={km.inertia_:>12.1f}  silhouette={sil:.4f}")

best_k = list(K_RANGE)[np.argmax(silhouettes)]
print(f"\n  ★ Best k by silhouette score: {best_k}")

# Plot Elbow + Silhouette
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

ax1.plot(list(K_RANGE), inertias, "o-", markersize=4)
ax1.axvline(best_k, color="red", linestyle="--", alpha=0.7, label=f"best k={best_k}")
ax1.set_title("Elbow Method")
ax1.set_xlabel("k (number of clusters)")
ax1.set_ylabel("Inertia (within-cluster sum of squares)")
ax1.legend()

ax2.plot(list(K_RANGE), silhouettes, "o-", markersize=4, color="green")
ax2.axvline(best_k, color="red", linestyle="--", alpha=0.7, label=f"best k={best_k}")
ax2.set_title("Silhouette Score")
ax2.set_xlabel("k (number of clusters)")
ax2.set_ylabel("Silhouette coefficient")
ax2.legend()

plt.tight_layout()
plt.savefig(OUTPUT_ELBOW, dpi=150)
print(f"Saved elbow/silhouette plot → {OUTPUT_ELBOW}")

# ── 4. Final K-Means with best k ────────────────────────────────────────────
print(f"\nRunning final K-Means with k={best_k} …")
kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=10)
labels = kmeans.fit_predict(coords_2d)
centroids = kmeans.cluster_centers_

n_clusters = best_k
print(f"  → {n_clusters} clusters, sizes: {dict(zip(*np.unique(labels, return_counts=True)))}")

# ── 5. Write output (quote movie names that contain commas) ─────────────────
df_out = pd.DataFrame({
    "movie": movies,
    "x": np.round(coords_2d[:, 0], 4),
    "y": np.round(coords_2d[:, 1], 4),
    "cluster": labels,
})
df_out.to_csv(OUTPUT_CSV, index=False, quoting=1)  # QUOTE_ALL
print(f"Saved 2-D coordinates + clusters → {OUTPUT_CSV}")

# ── 6. Scatter plot ─────────────────────────────────────────────────────────
print("Generating scatter plot …")
fig, ax = plt.subplots(figsize=(14, 10))

cmap = plt.colormaps.get_cmap("tab20")

for label in range(n_clusters):
    mask = labels == label
    ax.scatter(coords_2d[mask, 0], coords_2d[mask, 1],
               c=[cmap(label % 20)], s=12, alpha=0.7, label=f"cluster {label}")

# Mark centroids
ax.scatter(centroids[:, 0], centroids[:, 1],
           c="black", marker="X", s=80, zorder=5, label="centroids")

ax.set_title(f"Movie Embeddings — t-SNE + K-Means  (k={n_clusters})")
ax.set_xlabel("t-SNE dim 1")
ax.set_ylabel("t-SNE dim 2")
if n_clusters <= 20:
    ax.legend(fontsize=7, markerscale=2, loc="best")

plt.tight_layout()
plt.savefig(OUTPUT_CLUSTERS, dpi=150)
print(f"Saved cluster plot → {OUTPUT_CLUSTERS}")
plt.show()
