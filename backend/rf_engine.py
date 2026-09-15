import numpy as np

class DecisionNode:
    def __init__(self, feature=None, threshold=None, left=None, right=None, probs=None):
        self.feature = feature
        self.threshold = threshold
        self.left = left
        self.right = right
        self.probs = probs  # Class probabilities array if leaf node

class SimpleDecisionTree:
    def __init__(self, max_depth=14, min_samples_split=2, max_features=12):
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.max_features = max_features
        self.root = None
        self.n_classes = None

    def fit(self, X: np.ndarray, y: np.ndarray, n_classes: int):
        self.n_classes = n_classes
        self.root = self._build_tree(X, y, depth=0)

    def _gini(self, y: np.ndarray) -> float:
        counts = np.bincount(y, minlength=self.n_classes)
        probs = counts / len(y)
        return 1.0 - float(np.sum(probs ** 2))

    def _build_tree(self, X: np.ndarray, y: np.ndarray, depth: int) -> DecisionNode:
        n_samples, n_features = X.shape
        counts = np.bincount(y, minlength=self.n_classes)
        smoothed = (counts.astype(np.float64) + 1e-4) / (len(y) + 1e-4 * self.n_classes)
        smoothed /= np.sum(smoothed)

        if depth >= self.max_depth or n_samples < self.min_samples_split or len(np.unique(y)) == 1:
            return DecisionNode(probs=smoothed)

        k = min(self.max_features, n_features)
        feat_indices = np.random.choice(n_features, size=k, replace=False)
        best_gain = -1.0
        best_feat = None
        current_impurity = self._gini(y)

        for feat in feat_indices:
            left_mask = X[:, feat] > 0.5
            n_left = np.sum(left_mask)
            n_right = n_samples - n_left
            if n_left == 0 or n_right == 0:
                continue

            gain = current_impurity - (
                (n_left / n_samples) * self._gini(y[left_mask]) +
                (n_right / n_samples) * self._gini(y[~left_mask])
            )
            if gain > best_gain:
                best_gain = gain
                best_feat = feat

        if best_gain <= 1e-4 or best_feat is None:
            return DecisionNode(probs=smoothed)

        left_mask = X[:, best_feat] > 0.5
        left_node = self._build_tree(X[left_mask], y[left_mask], depth + 1)
        right_node = self._build_tree(X[~left_mask], y[~left_mask], depth + 1)

        return DecisionNode(feature=best_feat, threshold=0.5, left=left_node, right=right_node)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return np.array([self._traverse(x, self.root) for x in X])

    def _traverse(self, x: np.ndarray, node: DecisionNode) -> np.ndarray:
        if node.probs is not None:
            return node.probs
        if x[node.feature] > node.threshold:
            return self._traverse(x, node.left)
        return self._traverse(x, node.right)

class TriageRandomForest:
    """
    Pure-NumPy Random Forest Classifier for TriageMed.
    Implements feature subsampling, bootstrap aggregation, and probability distribution output.
    """
    def __init__(self, n_estimators: int = 50, max_depth: int = 14, random_state: int = 42):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.random_state = random_state
        self.trees = []
        self.n_classes = None

    def fit(self, X: np.ndarray, y: np.ndarray):
        np.random.seed(self.random_state)
        n_samples, n_features = X.shape
        self.n_classes = int(np.max(y)) + 1
        max_feat = max(4, int(np.sqrt(n_features)))

        self.trees = []
        for _ in range(self.n_estimators):
            boot_idx = np.random.choice(n_samples, size=n_samples, replace=True)
            X_b, y_b = X[boot_idx], y[boot_idx]

            tree = SimpleDecisionTree(max_depth=self.max_depth, max_features=max_feat)
            tree.fit(X_b, y_b, self.n_classes)
            self.trees.append(tree)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        all_probs = np.array([tree.predict_proba(X) for tree in self.trees])
        mean_probs = np.mean(all_probs, axis=0)
        return mean_probs / np.sum(mean_probs, axis=-1, keepdims=True)

    def score(self, X: np.ndarray, y: np.ndarray) -> float:
        probs = self.predict_proba(X)
        preds = np.argmax(probs, axis=1)
        return float(np.mean(preds == y))
