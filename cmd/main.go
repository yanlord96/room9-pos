package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"room9/internal/db"
	"room9/internal/handlers"
	"room9/internal/middleware"

	"github.com/gin-gonic/gin"
)

func spaHandler(distDir string) gin.HandlerFunc {
	fs := http.Dir(distDir)
	fileServer := http.FileServer(fs)
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		// If it starts with /api, return JSON 404
		if strings.HasPrefix(path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
			return
		}
		// Check if the file exists in dist
		f, err := fs.Open(path)
		if err != nil {
			// File not found → serve index.html for SPA routing
			c.File(distDir + "/index.html")
			return
		}
		f.Close()
		fileServer.ServeHTTP(c.Writer, c.Request)
	}
}

func main() {
	gin.SetMode(gin.ReleaseMode)

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "/data/room9.db"
	}

	distDir := os.Getenv("DIST_DIR")
	if distDir == "" {
		distDir = "./web/dist"
	}

	database, err := db.Init(dbPath)
	if err != nil {
		log.Fatalf("failed to init db: %v", err)
	}

	h := handlers.New(database)
	r := gin.Default()

	// ── API routes ──────────────────────────────────────────────────────────
	api := r.Group("/api")
	{
		api.POST("/auth/login", h.APILogin)
		api.POST("/auth/logout", h.APILogout)

		auth := api.Group("/")
		auth.Use(middleware.APIRequireAuth(database))
		{
			auth.GET("/auth/me", h.APIMe)
			auth.GET("/dashboard", h.APIDashboard)

			auth.GET("/customers", h.APICustomerList)
			auth.POST("/customers", h.APICustomerCreate)
			auth.PUT("/customers/:id", h.APICustomerUpdate)
			auth.DELETE("/customers/:id", h.APICustomerDelete)

			auth.GET("/menu", h.APIMenuList)
			auth.POST("/menu", h.APIMenuCreate)
			auth.PUT("/menu/:id", h.APIMenuUpdate)
			auth.DELETE("/menu/:id", h.APIMenuDelete)

			auth.GET("/tables", h.APITableList)
			auth.POST("/tables", h.APITableCreate)
			auth.PUT("/tables/:id", h.APITableUpdate)
			auth.DELETE("/tables/:id", h.APITableDelete)

			auth.GET("/bookings", h.APIBookingPage)
			auth.POST("/bookings/start", h.APIBookingStart)
			auth.GET("/bookings/:id", h.APIBookingDetail)
			auth.POST("/bookings/:id/end", h.APIBookingEnd)
			auth.GET("/bookings/:id/receipt", h.APIBookingReceipt)

			auth.POST("/orders", h.APIOrderCreate)
			auth.DELETE("/orders/:id", h.APIOrderDelete)

			auth.GET("/payments", h.APIPaymentList)

			admin := auth.Group("/")
			admin.Use(middleware.APIRequireAdmin())
			{
				admin.GET("/reports", h.APIReportData)
				admin.GET("/users", h.APIUserList)
				admin.POST("/users", h.APIUserCreate)
				admin.PUT("/users/:id", h.APIUserUpdate)
				admin.DELETE("/users/:id", h.APIUserDelete)
			}
		}
	}

	// ── React SPA (catch-all) ────────────────────────────────────────────────
	r.NoRoute(spaHandler(distDir))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Room9 POS starting on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
