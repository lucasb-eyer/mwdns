package main

import(
	"html/template"
	"log"
	"net/http"
	"os"
	"time"
)

type AutoTemplate struct {
	tpl  *template.Template
	when time.Time
	path string
}

func load(tpl *AutoTemplate, filename string) {
	// Order *is* important for "race conditions".
	tpl.when = time.Now()
	tpl.tpl = template.Must(template.ParseFiles(filename))
	tpl.path = filename

	log.Println("Loaded template", tpl.path)
}

func CreateAutoTemplate(filename string) (tpl *AutoTemplate) {
	tpl = new(AutoTemplate)
	load(tpl, filename)
	return
}

func (self *AutoTemplate) Execute(c http.ResponseWriter, data interface{}) {
	// Check if we the template was modified on disk since we loaded it.
	// If so, we need to reload it.
	if stat, err := os.Stat(self.path) ; err == nil {
		if stat.ModTime().After(self.when) {
			load(self, self.path)
		}
	} else {
		log.Println("Error stat'ing ", self.path)
	}

	self.tpl.Execute(c, data)
}
