package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func (h *Handler) APIAnalytics(c *gin.Context) {
	yearStr := c.DefaultQuery("year", strconv.Itoa(time.Now().Year()))
	monthStr := c.DefaultQuery("month", strconv.Itoa(int(time.Now().Month())))
	year, _ := strconv.Atoi(yearStr)
	month, _ := strconv.Atoi(monthStr)
	yy := fmt.Sprintf("%04d", year)
	mm := fmt.Sprintf("%02d", month)

	// ── Table utilization ────────────────────────────────────────────────
	type TableUsage struct {
		TableName      string  `json:"table_name"`
		Sessions       int     `json:"sessions"`
		TotalHours     float64 `json:"total_hours"`
		AvgHoursPerUse float64 `json:"avg_hours_per_use"`
		ActiveDays     int     `json:"active_days"`
		AvgHoursPerDay float64 `json:"avg_hours_per_day"`
	}
	usageRows, _ := h.db.Query(`
		SELECT t.name,
		       COUNT(s.id),
		       COALESCE(SUM((julianday(s.ended_at) - julianday(s.started_at)) * 24), 0),
		       COUNT(DISTINCT strftime('%Y-%m-%d', s.ended_at, 'localtime'))
		FROM pool_tables t
		LEFT JOIN sessions s ON s.table_id = t.id
			AND s.status = 'completed'
			AND s.ended_at IS NOT NULL
			AND strftime('%Y', s.ended_at, 'localtime') = ?
			AND strftime('%m', s.ended_at, 'localtime') = ?
		GROUP BY t.id, t.name
		ORDER BY 3 DESC
	`, yy, mm)
	tableUsage := []TableUsage{}
	for usageRows.Next() {
		var u TableUsage
		usageRows.Scan(&u.TableName, &u.Sessions, &u.TotalHours, &u.ActiveDays)
		if u.Sessions > 0 {
			u.AvgHoursPerUse = u.TotalHours / float64(u.Sessions)
		}
		if u.ActiveDays > 0 {
			u.AvgHoursPerDay = u.TotalHours / float64(u.ActiveDays)
		}
		tableUsage = append(tableUsage, u)
	}
	usageRows.Close()

	// ── Best-selling F&B products ────────────────────────────────────────
	type ProductSale struct {
		ItemName     string  `json:"item_name"`
		ItemCategory string  `json:"item_category"`
		QtySold      int     `json:"qty_sold"`
		Revenue      float64 `json:"revenue"`
	}
	saleRows, _ := h.db.Query(`
		SELECT item_name, item_category, SUM(qty), SUM(revenue)
		FROM (
			SELECT m.name AS item_name, m.category AS item_category,
			       o.quantity AS qty, o.quantity * o.unit_price AS revenue
			FROM orders o JOIN menu_items m ON m.id = o.menu_item_id
			WHERE strftime('%Y', o.created_at, 'localtime') = ?
			  AND strftime('%m', o.created_at, 'localtime') = ?
			UNION ALL
			SELECT wi.item_name, wi.item_category,
			       wi.quantity AS qty, wi.quantity * wi.unit_price AS revenue
			FROM walkin_order_items wi JOIN walkin_orders w ON w.id = wi.order_id
			WHERE strftime('%Y', w.created_at, 'localtime') = ?
			  AND strftime('%m', w.created_at, 'localtime') = ?
		)
		GROUP BY item_name
		ORDER BY SUM(qty) DESC
	`, yy, mm, yy, mm)
	productSales := []ProductSale{}
	for saleRows.Next() {
		var p ProductSale
		saleRows.Scan(&p.ItemName, &p.ItemCategory, &p.QtySold, &p.Revenue)
		productSales = append(productSales, p)
	}
	saleRows.Close()

	c.JSON(http.StatusOK, gin.H{
		"year":          year,
		"month":         month,
		"table_usage":   tableUsage,
		"product_sales": productSales,
	})
}
