package sitecontent

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	maxGalleryUploadFiles = 30
	maxGalleryUploadSize  = 12 << 20 // 12 MiB per file
)

var imageExtensionByContentType = map[string]string{
	"image/jpeg":    ".jpg",
	"image/png":     ".png",
	"image/webp":    ".webp",
	"image/gif":     ".gif",
	"image/avif":    ".avif",
	"image/svg+xml": ".svg",
}

func uploadGalleryAssets(fileHeaders []*multipart.FileHeader) (GalleryAssetUploadResult, error) {
	if len(fileHeaders) == 0 {
		return GalleryAssetUploadResult{}, fmt.Errorf("至少选择一张图片")
	}
	if len(fileHeaders) > maxGalleryUploadFiles {
		return GalleryAssetUploadResult{}, fmt.Errorf("单次最多上传 %d 张图片", maxGalleryUploadFiles)
	}

	uploadDir, err := resolveGalleryUploadDir()
	if err != nil {
		return GalleryAssetUploadResult{}, err
	}
	if mkErr := os.MkdirAll(uploadDir, 0o755); mkErr != nil {
		return GalleryAssetUploadResult{}, mkErr
	}

	files := make([]GalleryAsset, 0, len(fileHeaders))
	for _, fileHeader := range fileHeaders {
		asset, saveErr := saveUploadedGalleryAsset(uploadDir, fileHeader)
		if saveErr != nil {
			return GalleryAssetUploadResult{}, saveErr
		}
		files = append(files, asset)
	}

	return GalleryAssetUploadResult{
		Files: files,
	}, nil
}

func saveUploadedGalleryAsset(uploadDir string, fileHeader *multipart.FileHeader) (GalleryAsset, error) {
	if fileHeader == nil {
		return GalleryAsset{}, fmt.Errorf("invalid file input")
	}
	if fileHeader.Size <= 0 {
		return GalleryAsset{}, fmt.Errorf("图片不能为空")
	}
	if fileHeader.Size > maxGalleryUploadSize {
		return GalleryAsset{}, fmt.Errorf("图片 %q 超过 12MB 限制", strings.TrimSpace(fileHeader.Filename))
	}

	source, err := fileHeader.Open()
	if err != nil {
		return GalleryAsset{}, err
	}
	defer source.Close()

	header := make([]byte, 512)
	readBytes, readErr := io.ReadFull(source, header)
	if readErr != nil && readErr != io.EOF && readErr != io.ErrUnexpectedEOF {
		return GalleryAsset{}, readErr
	}
	contentType := http.DetectContentType(header[:readBytes])
	extension, ok := imageExtensionByContentType[contentType]
	if !ok {
		return GalleryAsset{}, fmt.Errorf("文件 %q 不是受支持的图片格式", strings.TrimSpace(fileHeader.Filename))
	}

	token, err := randomHex(8)
	if err != nil {
		return GalleryAsset{}, err
	}
	filename := fmt.Sprintf("%d-%s%s", time.Now().UnixNano(), token, extension)
	targetPath := filepath.Join(uploadDir, filename)

	target, err := os.Create(targetPath)
	if err != nil {
		return GalleryAsset{}, err
	}
	defer target.Close()

	if readBytes > 0 {
		if _, err := target.Write(header[:readBytes]); err != nil {
			return GalleryAsset{}, err
		}
	}

	if _, err := io.Copy(target, source); err != nil {
		return GalleryAsset{}, err
	}

	return GalleryAsset{
		URL:          "/graphs/uploads/" + filename,
		Filename:     filename,
		OriginalName: strings.TrimSpace(fileHeader.Filename),
		ContentType:  contentType,
		Size:         fileHeader.Size,
	}, nil
}

func resolveGalleryUploadDir() (string, error) {
	customDir := strings.TrimSpace(os.Getenv("SITE_GALLERY_UPLOAD_DIR"))
	if customDir != "" {
		return filepath.Abs(customDir)
	}

	candidates := []string{
		filepath.Join("frontend", "public", "graphs", "uploads"),
		filepath.Join("..", "frontend", "public", "graphs", "uploads"),
	}
	for _, candidate := range candidates {
		parent := filepath.Dir(candidate)
		if _, err := os.Stat(parent); err == nil {
			return filepath.Abs(candidate)
		}
	}

	return filepath.Abs(candidates[0])
}

func randomHex(byteCount int) (string, error) {
	if byteCount <= 0 {
		return "", fmt.Errorf("invalid random byte length")
	}

	buf := make([]byte, byteCount)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}

	return hex.EncodeToString(buf), nil
}
