import { Project } from '../models/Project.js'

export const assignRandomProject = async (teamId) => {
  const unassignedCount = await Project.countDocuments({ assigned: false })

  // Round 1: unique allocation from unassigned pool.
  if (unassignedCount > 0) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const [project] = await Project.aggregate([
        { $match: { assigned: false } },
        { $sample: { size: 1 } }
      ])

      if (!project) {
        return null
      }

      const assignedAt = new Date()
      const updated = await Project.findOneAndUpdate(
        { _id: project._id, assigned: false },
        {
          $set: {
            assigned: true,
            assignedTo: teamId,
            assignedAt
          }
        },
        { new: true }
      )

      if (updated) {
        return {
          title: updated.title,
          description: updated.description,
          difficulty: updated.difficulty,
          domain: updated.domain,
          technologies: updated.technologies,
          assignedAt
        }
      }
    }

    return null
  }

  // Round 2+: pool exhausted, allow random reuse to keep assignment running.
  const [reusedProject] = await Project.aggregate([{ $sample: { size: 1 } }])
  if (!reusedProject) {
    return null
  }

  return {
    title: reusedProject.title,
    description: reusedProject.description,
    difficulty: reusedProject.difficulty,
    domain: reusedProject.domain,
    technologies: reusedProject.technologies,
    assignedAt: new Date()
  }
}

export const getProjectStats = async () => {
  const [totalProjects, assignedProjects] = await Promise.all([
    Project.countDocuments(),
    Project.countDocuments({ assigned: true })
  ])

  return {
    totalProjects,
    assignedProjects,
    remainingProjects: totalProjects - assignedProjects
  }
}
