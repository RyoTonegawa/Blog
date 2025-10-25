# SVD（特異値分解）を手計算ステップで理解する

LoRA を理解するには、行列を「直交行列 × 対角行列 × 直交行列」の形に分解する SVD の手順をイメージできると便利です。ここでは 2×2 の具体例を用いて、式を追いながら SVD を計算する流れを整理します。

## 0. 例として使う行列
\[
W =
\begin{bmatrix}
4 & 0 \\
3 & 5
\end{bmatrix}
\in \mathbb{R}^{2 \times 2}
\]

## 1. \(W^\top W\) を作る
\[
W^\top W =
\begin{bmatrix}
4 & 3 \\
0 & 5
\end{bmatrix}
\begin{bmatrix}
4 & 0 \\
3 & 5
\end{bmatrix}
=
\begin{bmatrix}
25 & 15 \\
15 & 25
\end{bmatrix}
\]

- \(W^\top W\) は常に対称正定値で、固有値は特異値の 2 乗に一致する。

## 2. \(W^\top W\) の固有値を求める

固有方程式 \(\det(W^\top W - \lambda I) = 0\):
\[
\left|
\begin{matrix}
25-\lambda & 15 \\
15 & 25-\lambda
\end{matrix}
\right|
=(25-\lambda)^2 - 15^2 = 0
\]

\[
(25-\lambda)^2 = 225
\Rightarrow
\lambda_1 = 40,\quad \lambda_2 = 10
\]

## 3. 特異値（\(\sigma_i\)）を得る
\[
\sigma_i = \sqrt{\lambda_i}
\Rightarrow
\sigma_1 = \sqrt{40} \approx 6.3249,\quad
\sigma_2 = \sqrt{10} \approx 3.1623
\]

## 4. 右特異ベクトル \(V = [v_1\ v_2]\)

各固有値に対応する固有ベクトルを正規化すると右特異ベクトルになる。

- \(\lambda_1 = 40\) の固有ベクトル：\([1, 1]^\top\)
- \(\lambda_2 = 10\) の固有ベクトル：\([1, -1]^\top\)

正規化して
\[
v_1 = \frac{1}{\sqrt{2}}
\begin{bmatrix}
1 \\ 1
\end{bmatrix},
\quad
v_2 = \frac{1}{\sqrt{2}}
\begin{bmatrix}
1 \\ -1
\end{bmatrix}
\]

よって
\[
V =
\begin{bmatrix}
\tfrac{1}{\sqrt{2}} & \tfrac{1}{\sqrt{2}} \\
\tfrac{1}{\sqrt{2}} & -\tfrac{1}{\sqrt{2}}
\end{bmatrix}
\]

## 5. 左特異ベクトル \(U\) を求める

公式 \(u_i = \frac{1}{\sigma_i} W v_i\) をそれぞれ計算する。

- \(u_1 = \frac{1}{6.3249} W v_1 = \frac{1}{6.3249} \cdot \frac{1}{\sqrt{2}} [4, 8]^\top = [0.4472,\, 0.8944]^\top\)
- \(u_2 = \frac{1}{3.1623} W v_2 = \frac{1}{3.1623} \cdot \frac{1}{\sqrt{2}} [4, -2]^\top = [0.8944,\, -0.4472]^\top\)

行列として
\[
U =
\begin{bmatrix}
0.4472 & 0.8944 \\
0.8944 & -0.4472
\end{bmatrix}
\]

## 6. 対角行列 \(\Sigma\)
\[
\Sigma =
\begin{bmatrix}
6.3249 & 0 \\
0 & 3.1623
\end{bmatrix}
\]

## 7. 組み合わせて確認する

SVD の形 \(W = U \Sigma V^\top\) を直接かけ戻すと
\[
U \Sigma V^\top =
\begin{bmatrix}
4 & 0 \\
3 & 5
\end{bmatrix}
\]
となり、元の行列が再現される。

## 8. ランク 1 近似を作る手順

1. \(\Sigma\) の最大特異値 \(\sigma_1\) のみ残し、残りを 0 にする。
2. \(U\) の 1 列目、\(V\) の 1 列目だけを用い
   \[
   W_1 = \sigma_1 \, u_1 v_1^\top
   \]
3. 上の例だと
   ```math
   W_1 \approx 6.3249
   \begin{bmatrix}
   0.4472 \\
   0.8944
   \end{bmatrix}
   \begin{bmatrix}
   0.7071 & 0.7071
   \end{bmatrix}
   =
   \begin{bmatrix}
   2.0 & 2.0 \\
   4.0 & 4.0
   \end{bmatrix}
   ```
   となり、元の行列の 80% 程度のエネルギー（後述）を保持した近似になる。

---

この手順をそのまま Python/numpy や PyTorch に実装した関数 (`torch.linalg.svd` など) が内部で行っており、LoRA で低ランク更新を扱う際にも「特異値が大きい成分から順に残す」ことが基本方針になる。
