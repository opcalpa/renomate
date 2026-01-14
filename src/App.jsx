import React, { useState, useEffect } from 'react'
import ProjectList from './components/ProjectList'
import ProjectDetail from './components/ProjectDetail'
import { supabase } from './lib/supabase'
import './App.css'

function App() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [loading, setLoading] = useState(true)

  // Ladda projekt från Supabase vid start
  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      
      // Om Supabase inte är konfigurerad, använd localStorage
      if (!supabase) {
        const savedProjects = localStorage.getItem('renovationProjects')
        if (savedProjects) {
          setProjects(JSON.parse(savedProjects))
        }
        setLoading(false)
        return
      }
      
      // Ladda projekt
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError

      // Ladda uppgifter för varje projekt
      if (projectsData && projectsData.length > 0) {
        const projectIds = projectsData.map(p => p.id)
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })

        if (tasksError) throw tasksError

        // Kombinera projekt med deras uppgifter
        const projectsWithTasks = projectsData.map(project => ({
          ...project,
          tasks: tasksData.filter(task => task.project_id === project.id) || []
        }))

        setProjects(projectsWithTasks)
      } else {
        setProjects([])
      }
    } catch (error) {
      console.error('Fel vid laddning av projekt:', error)
      // Fallback till localStorage om Supabase inte är konfigurerad
      const savedProjects = localStorage.getItem('renovationProjects')
      if (savedProjects) {
        setProjects(JSON.parse(savedProjects))
      }
    } finally {
      setLoading(false)
    }
  }

  const createProject = async (name, description) => {
    try {
      // Om Supabase inte är konfigurerad, använd localStorage direkt
      if (!supabase) {
        const newProject = {
          id: Date.now().toString(),
          name,
          description,
          tasks: [],
          created_at: new Date().toISOString()
        }
        const updatedProjects = [newProject, ...projects]
        setProjects(updatedProjects)
        localStorage.setItem('renovationProjects', JSON.stringify(updatedProjects))
        return
      }
      
      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            name,
            description: description || null
          }
        ])
        .select()
        .single()

      if (error) throw error

      const newProject = {
        ...data,
        tasks: []
      }
      setProjects([newProject, ...projects])
    } catch (error) {
      console.error('Fel vid skapande av projekt:', error)
      // Fallback till localStorage
      const newProject = {
        id: Date.now().toString(),
        name,
        description,
        tasks: [],
        created_at: new Date().toISOString()
      }
      setProjects([newProject, ...projects])
      localStorage.setItem('renovationProjects', JSON.stringify([newProject, ...projects]))
    }
  }

  const deleteProject = async (projectId) => {
    try {
      // Om Supabase inte är konfigurerad, använd localStorage direkt
      if (!supabase) {
        const updatedProjects = projects.filter(p => p.id !== projectId)
        setProjects(updatedProjects)
        if (selectedProject?.id === projectId) {
          setSelectedProject(null)
        }
        localStorage.setItem('renovationProjects', JSON.stringify(updatedProjects))
        return
      }
      
      // Ta bort alla uppgifter först
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('project_id', projectId)

      if (tasksError) throw tasksError

      // Ta bort projektet
      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (projectError) throw projectError

      setProjects(projects.filter(p => p.id !== projectId))
      if (selectedProject?.id === projectId) {
        setSelectedProject(null)
      }
    } catch (error) {
      console.error('Fel vid borttagning av projekt:', error)
      // Fallback
      setProjects(projects.filter(p => p.id !== projectId))
      if (selectedProject?.id === projectId) {
        setSelectedProject(null)
      }
      localStorage.setItem('renovationProjects', JSON.stringify(projects.filter(p => p.id !== projectId)))
    }
  }

  const addTask = async (projectId, taskName, taskDescription) => {
    try {
      // Om Supabase inte är konfigurerad, använd localStorage direkt
      if (!supabase) {
        const newTask = {
          id: Date.now().toString(),
          project_id: projectId,
          name: taskName,
          description: taskDescription,
          completed: false,
          created_at: new Date().toISOString()
        }
        const updatedProjects = projects.map(project => 
          project.id === projectId
            ? { ...project, tasks: [...project.tasks, newTask] }
            : project
        )
        setProjects(updatedProjects)
        if (selectedProject?.id === projectId) {
          setSelectedProject({
            ...selectedProject,
            tasks: [...selectedProject.tasks, newTask]
          })
        }
        localStorage.setItem('renovationProjects', JSON.stringify(updatedProjects))
        return
      }
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            project_id: projectId,
            name: taskName,
            description: taskDescription || null,
            completed: false
          }
        ])
        .select()
        .single()

      if (error) throw error

      setProjects(projects.map(project => 
        project.id === projectId
          ? { ...project, tasks: [...project.tasks, data] }
          : project
      ))

      // Uppdatera selectedProject om det är det aktuella projektet
      if (selectedProject?.id === projectId) {
        setSelectedProject({
          ...selectedProject,
          tasks: [...selectedProject.tasks, data]
        })
      }
    } catch (error) {
      console.error('Fel vid skapande av uppgift:', error)
      // Fallback
      const newTask = {
        id: Date.now().toString(),
        project_id: projectId,
        name: taskName,
        description: taskDescription,
        completed: false,
        created_at: new Date().toISOString()
      }
      const updatedProjects = projects.map(project => 
        project.id === projectId
          ? { ...project, tasks: [...project.tasks, newTask] }
          : project
      )
      setProjects(updatedProjects)
      localStorage.setItem('renovationProjects', JSON.stringify(updatedProjects))
    }
  }

  const toggleTask = async (projectId, taskId) => {
    try {
      const project = projects.find(p => p.id === projectId)
      const task = project?.tasks.find(t => t.id === taskId)
      if (!task) return

      // Om Supabase inte är konfigurerad, använd localStorage direkt
      if (!supabase) {
        const updatedProjects = projects.map(project =>
          project.id === projectId
            ? {
                ...project,
                tasks: project.tasks.map(task =>
                  task.id === taskId
                    ? { ...task, completed: !task.completed }
                    : task
                )
              }
            : project
        )
        setProjects(updatedProjects)
        if (selectedProject?.id === projectId) {
          setSelectedProject({
            ...selectedProject,
            tasks: selectedProject.tasks.map(task =>
              task.id === taskId
                ? { ...task, completed: !task.completed }
                : task
            )
          })
        }
        localStorage.setItem('renovationProjects', JSON.stringify(updatedProjects))
        return
      }

      const { error } = await supabase
        .from('tasks')
        .update({ completed: !task.completed })
        .eq('id', taskId)

      if (error) throw error

      const updatedProjects = projects.map(project =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.map(task =>
                task.id === taskId
                  ? { ...task, completed: !task.completed }
                  : task
              )
            }
          : project
      )
      setProjects(updatedProjects)

      // Uppdatera selectedProject
      if (selectedProject?.id === projectId) {
        setSelectedProject({
          ...selectedProject,
          tasks: selectedProject.tasks.map(task =>
            task.id === taskId
              ? { ...task, completed: !task.completed }
              : task
          )
        })
      }
    } catch (error) {
      console.error('Fel vid uppdatering av uppgift:', error)
      // Fallback
      const updatedProjects = projects.map(project =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.map(task =>
                task.id === taskId
                  ? { ...task, completed: !task.completed }
                  : task
              )
            }
          : project
      )
      setProjects(updatedProjects)
      localStorage.setItem('renovationProjects', JSON.stringify(updatedProjects))
    }
  }

  const deleteTask = async (projectId, taskId) => {
    try {
      // Om Supabase inte är konfigurerad, använd localStorage direkt
      if (!supabase) {
        const updatedProjects = projects.map(project =>
          project.id === projectId
            ? {
                ...project,
                tasks: project.tasks.filter(task => task.id !== taskId)
              }
            : project
        )
        setProjects(updatedProjects)
        if (selectedProject?.id === projectId) {
          setSelectedProject({
            ...selectedProject,
            tasks: selectedProject.tasks.filter(task => task.id !== taskId)
          })
        }
        localStorage.setItem('renovationProjects', JSON.stringify(updatedProjects))
        return
      }
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      const updatedProjects = projects.map(project =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.filter(task => task.id !== taskId)
            }
          : project
      )
      setProjects(updatedProjects)

      // Uppdatera selectedProject
      if (selectedProject?.id === projectId) {
        setSelectedProject({
          ...selectedProject,
          tasks: selectedProject.tasks.filter(task => task.id !== taskId)
        })
      }
    } catch (error) {
      console.error('Fel vid borttagning av uppgift:', error)
      // Fallback
      const updatedProjects = projects.map(project =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.filter(task => task.id !== taskId)
            }
          : project
      )
      setProjects(updatedProjects)
      localStorage.setItem('renovationProjects', JSON.stringify(updatedProjects))
    }
  }

  const selectProject = (project) => {
    setSelectedProject(project)
  }

  const goBack = () => {
    setSelectedProject(null)
  }

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>🏠 Renomate</h1>
          <p>Laddar projekt...</p>
        </header>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏠 Renomate</h1>
        <p>Hantera dina byggprojekt och uppgifter på ett enkelt sätt</p>
      </header>

      {selectedProject ? (
        <ProjectDetail
          project={selectedProject}
          onBack={goBack}
          onAddTask={addTask}
          onToggleTask={toggleTask}
          onDeleteTask={deleteTask}
        />
      ) : (
        <ProjectList
          projects={projects}
          onCreateProject={createProject}
          onSelectProject={selectProject}
          onDeleteProject={deleteProject}
        />
      )}
    </div>
  )
}

export default App
