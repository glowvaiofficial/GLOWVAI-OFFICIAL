import type { ComponentType } from 'react';
import type { PortedScreenName } from '../../core/routes/names';
import { RecommendationOverviewScreen } from './RecommendationOverviewScreen';
import { RoutinePrescriberScreen } from './RoutinePrescriberScreen';
import { IngredientAuditScreen } from './IngredientAuditScreen';
import { PatchTestGuideScreen } from './PatchTestGuideScreen';
import { RoutineCheckoutScreen } from './RoutineCheckoutScreen';
import './recommendations.css';

export const routes: Partial<Record<PortedScreenName, ComponentType>> = {
  'recommend-overview': RecommendationOverviewScreen,
  'recommend-routine': RoutinePrescriberScreen,
  'recommend-ingredients': IngredientAuditScreen,
  'recommend-patch-test': PatchTestGuideScreen,
  'recommend-checkout': RoutineCheckoutScreen,
};
