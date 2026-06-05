"""
Unsupervised pipeline:
  1. Load 768-D embedding vectors from final.csv
  2. Reduce to 2-D with t-SNE (preserves local neighbourhood structure)
  3. Cluster the 2-D points with DBSCAN (density-based, no need to pick k)
  4. Write output CSV: movie, x, y, cluster
"""

import numpy as np
import pandas as pd
from sklearn.manifold import TSNE
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt
import os

# ── 1. Load data ─────────────────────────────────────────────────────────────
INPUT = os.path.join(os.path.dirname(__file__), "final.csv")
OUTPUT_CSV = os.path.join(os.path.dirname(__file__), "output_2d.csv")
OUTPUT_PNG = os.path.join(os.path.dirname(__file__), "clusters.png")

print("Loading embeddings …")

# Custom loader: movie names can contain commas (e.g. "abdullah, the final witness")
# so we split each line on the FIRST comma only — everything before is the name,
# everything after is the 768 float values separated by commas.
movies_list = []
vectors_list = []
with open(INPUT, "r") as f:
    header = f.readline()  # skip header
    for line in f:
        line = line.strip()
        if not line:
            continue
        # Find the first comma that is followed by a float-like value
        # The vector always starts with a number like "0.xxx" or "-0.xxx"
        # We split from the right: last 768 commas delimit the vector
        parts = line.split(",")
        # The vector is always 768 floats at the end
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
    perplexity=30,        # controls neighbourhood size (~5-50)
    learning_rate="auto",
    init="pca",           # deterministic init for reproducibility
    random_state=42,
    max_iter=1000,
    metric="cosine",      # embeddings are best compared via cosine similarity
)
coords_2d = tsne.fit_transform(vectors)

# Normalise to [0, 1000] range for easy visualisation
x_min, x_max = coords_2d[:, 0].min(), coords_2d[:, 0].max()
y_min, y_max = coords_2d[:, 1].min(), coords_2d[:, 1].max()
coords_2d[:, 0] = (coords_2d[:, 0] - x_min) / (x_max - x_min) * 1000
coords_2d[:, 1] = (coords_2d[:, 1] - y_min) / (y_max - y_min) * 1000

# ── 3. DBSCAN clustering on the 2-D projection ──────────────────────────────
print("Running DBSCAN parameter sweep …")
# Scale the 2-D coords before DBSCAN so eps is meaningful
scaler = StandardScaler()
coords_scaled = scaler.fit_transform(coords_2d)

total = len(movies)
best = None

# Sweep: try many (eps, min_samples) combos
# Goal: noise < 5% of total AND 10–80 distinct clusters
eps_values = np.arange(0.05, 0.60, 0.01)
min_samples_values = [3, 4, 5, 6, 7, 8, 10]

for ms in min_samples_values:
    for ep in eps_values:
        db = DBSCAN(eps=ep, min_samples=ms, metric="euclidean")
        lbl = db.fit_predict(coords_scaled)
        nc = len(set(lbl) - {-1})
        nn = (lbl == -1).sum()
        noise_pct = nn / total * 100

        # Want: low noise, reasonable cluster count, no single mega-cluster
        if nc < 10 or nc > 80:
            continue
        if noise_pct > 5:
            continue

        # Check largest cluster isn't > 40% of all points
        from collections import Counter
        cluster_sizes = Counter(lbl)
        cluster_sizes.pop(-1, None)
        largest = max(cluster_sizes.values()) if cluster_sizes else total
        if largest / total > 0.40:
            continue

        # Score: prefer more clusters + less noise
        score = nc - noise_pct * 2  # simple heuristic

        if best is None or score > best["score"]:
            best = {
                "eps": round(ep, 3),
                "min_samples": ms,
                "n_clusters": nc,
                "n_noise": nn,
                "noise_pct": round(noise_pct, 1),
                "largest_pct": round(largest / total * 100, 1),
                "score": score,
                "labels": lbl,
            }
            print(f"  candidate: eps={best['eps']}, min_samples={ms}, "
                  f"clusters={nc}, noise={nn} ({best['noise_pct']}%), "
                  f"largest_cluster={best['largest_pct']}%")

if best is None:
    # Fallback: relax constraints and just pick lowest noise
    print("  No ideal config found, relaxing constraints …")
    for ms in min_samples_values:
        for ep in eps_values:
            db = DBSCAN(eps=ep, min_samples=ms, metric="euclidean")
            lbl = db.fit_predict(coords_scaled)
            nc = len(set(lbl) - {-1})
            nn = (lbl == -1).sum()
            noise_pct = nn / total * 100
            if nc >= 5:
                score = nc - noise_pct
                if best is None or score > best["score"]:
                    best = {
                        "eps": round(ep, 3), "min_samples": ms,
                        "n_clusters": nc, "n_noise": nn,
                        "noise_pct": round(noise_pct, 1),
                        "largest_pct": 0, "score": score, "labels": lbl,
                    }

labels = best["labels"]
n_clusters = best["n_clusters"]
n_noise = best["n_noise"]
print(f"\n✅ Best params: eps={best['eps']}, min_samples={best['min_samples']}")
print(f"   → {n_clusters} clusters, {n_noise} noise ({best['noise_pct']}%)")

# ── 4. Write output ─────────────────────────────────────────────────────────
df_out = pd.DataFrame({
    "movie": movies,
    "x": np.round(coords_2d[:, 0], 4),
    "y": np.round(coords_2d[:, 1], 4),
    "cluster": labels,
})
df_out.to_csv(OUTPUT_CSV, index=False, quoting=1)  # QUOTE_ALL
print(f"Saved 2-D coordinates + clusters → {OUTPUT_CSV}")

# ── 5. Plot ──────────────────────────────────────────────────────────────────
print("Generating scatter plot …")
fig, ax = plt.subplots(figsize=(14, 10))

unique_labels = sorted(set(labels))
cmap = plt.cm.get_cmap("tab20", max(n_clusters, 1))

for label in unique_labels:
    mask = labels == label
    if label == -1:
        ax.scatter(coords_2d[mask, 0], coords_2d[mask, 1],
                   c="lightgray", s=8, alpha=0.4, label="noise")
    else:
        ax.scatter(coords_2d[mask, 0], coords_2d[mask, 1],
                   c=[cmap(label)], s=12, alpha=0.7, label=f"cluster {label}")

ax.set_title(f"Movie Embeddings — t-SNE + DBSCAN  ({n_clusters} clusters, {n_noise} noise)")
ax.set_xlabel("t-SNE dim 1")
ax.set_ylabel("t-SNE dim 2")
if n_clusters <= 20:
    ax.legend(fontsize=7, markerscale=2, loc="best")

plt.tight_layout()
plt.savefig(OUTPUT_PNG, dpi=150)
print(f"Saved plot → {OUTPUT_PNG}")
plt.show()
