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

    devMode bool //whether we would like to reload constantly
}

func (tpl *AutoTemplate) load() {
    // Order *is* important for "race conditions".
    tpl.when = time.Now()
    tpl.tpl = template.Must(template.ParseFiles(tpl.path))
    log.Printf("Loaded template '%v'\n", tpl.path)
}

// the load function needs to be called separately from the creation
func CreateAutoTemplate(filename string, devMode bool) (tpl *AutoTemplate) {
    tpl = new(AutoTemplate)
    tpl.devMode = devMode
    tpl.path = filename
    return
}

func (self *AutoTemplate) Execute(c http.ResponseWriter, data interface{}) {
    if self.devMode {
        // Check if we the template was modified on disk since we loaded it.
        // If so, we need to reload it.
        if stat, err := os.Stat(self.path) ; err == nil {
            if stat.ModTime().After(self.when) {
                self.load()
            }
        } else {
            log.Println("Error stat'ing ", self.path)
        }
    }

    self.tpl.Execute(c, data)
}
