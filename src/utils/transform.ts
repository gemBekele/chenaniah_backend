/**
 * Transform Prisma camelCase objects to snake_case for API compatibility
 */

export function transformAppointment(apt: any): any {
  return {
    id: apt.id,
    applicant_name: apt.applicantName,
    applicant_email: apt.applicantEmail,
    applicant_phone: apt.applicantPhone,
    scheduled_date: apt.scheduledDate,
    scheduled_time: apt.scheduledTime,
    status: apt.status,
    notes: apt.notes,
    selected_song: apt.selectedSong,
    additional_song: apt.additionalSong,
    additional_song_singer: apt.additionalSongSinger,
    coordinator_verified: apt.coordinatorVerified,
    coordinator_verified_at: apt.coordinatorVerifiedAt,
    coordinator_approved: apt.coordinatorApproved,
    coordinator_approved_at: apt.coordinatorApprovedAt,
    final_decision: apt.finalDecision,
    decision_made_at: apt.decisionMadeAt,
    created_at: apt.createdAt,
    updated_at: apt.updatedAt,
  };
}

export function transformAppointments(appointments: any[]): any[] {
  return appointments.map(transformAppointment);
}

export function transformEvaluation(eval_: any): any {
  return {
    appointment_id: eval_.appointmentId,
    judge_name: eval_.judgeName,
    criteria_name: eval_.criteriaName,
    rating: eval_.rating,
    comments: eval_.comments,
    created_at: eval_.createdAt,
    updated_at: eval_.updatedAt,
  };
}

export function transformEvaluations(evaluations: any[]): any[] {
  return evaluations.map(transformEvaluation);
}


